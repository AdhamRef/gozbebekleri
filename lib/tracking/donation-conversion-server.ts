/**
 * Server-side conversion senders for donations.
 *
 * Donate (success)
 * ----------------
 * Called by POST /api/donations/:id/track-conversion when the /success page
 * loads for a PAID donation. The same donation.id-derived event_id is also
 * used by the browser fbq fire in TrackingPixels.tsx `trackDonate` — Meta
 * dedupes the browser↔server pair into a single conversion.
 *
 * DonateFailed (lookalike seed)
 * -----------------------------
 * Still fired from the payment-provider callbacks (PayFor fail, Stripe
 * `payment_intent.payment_failed` + invoice/session failures,
 * PATCH /api/donations/:id/fail). Failed donors typically never reach a
 * /success-style landing page, so we cannot drive this from the browser
 * without losing signal. The browser has NO fbq fire for DonateFailed —
 * `payment_failed` is absent from META_EVENT_MAP and present in
 * META_CAPI_OFF_CHANNEL, so /api/track refuses to mirror it.
 *
 * Idempotency
 * -----------
 * Each path atomically claims its timestamp BEFORE sending:
 *
 *   const { count } = await prisma.donation.updateMany({
 *     where: { id, conversionEventsSentAt: null, status: "PAID" },
 *     data:  { conversionEventsSentAt: new Date() },
 *   });
 *   if (count === 0) return; // another concurrent firer already claimed
 *
 * This collapses the read-then-write race (multi-tab /success opens, webhook
 * retries, cross-browser link-shares all hitting the same donation) into a
 * single atomic write. Exactly one CAPI Donate per donation, ever.
 *
 * If the Graph POST then fails, we DO NOT release the claim. Meta might have
 * still received the event (network blip on the response leg); replaying it
 * could double-count. We log loud instead, and the failure is visible in the
 * /api/admin tracking endpoints.
 */

import { prisma } from "@/lib/prisma";
import {
  getMetaCapiCredentials,
  sendMetaCapiEvent,
  type MetaUserData,
  type MetaCustomData,
  type MetaContent,
  type MetaCapiResult,
} from "@/lib/tracking/meta-capi";
import { metaDonationEventId } from "@/lib/tracking/canonical";

type Attribution = Record<string, string>;

function getStr(j: unknown, k: string): string | undefined {
  if (!j || typeof j !== "object") return undefined;
  const v = (j as Record<string, unknown>)[k];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// ─── Shared loader ────────────────────────────────────────────────────────────

async function loadDonationForConversion(donationId: string) {
  return prisma.donation.findUnique({
    where: { id: donationId },
    include: {
      donor: {
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          countryCode: true,
          city: true,
          region: true,
          gender: true,
          birthdate: true,
        },
      },
      items: { include: { campaign: { select: { id: true, title: true } } } },
      categoryItems: { include: { category: { select: { id: true, name: true } } } },
    },
  });
}

type LoadedDonation = NonNullable<Awaited<ReturnType<typeof loadDonationForConversion>>>;

function buildUserDataFromDonation(row: LoadedDonation): MetaUserData {
  const attribution = (row.attribution ?? undefined) as Attribution | undefined;
  const [first_name, ...rest] = (row.donor?.name ?? "").trim().split(/\s+/);
  const last_name = rest.join(" ") || undefined;

  return {
    external_id: row.donor?.id ?? null,
    email: row.donor?.email ?? null,
    phone: row.donor?.phone ?? null,
    first_name: first_name || null,
    last_name: last_name || null,
    city: row.donor?.city ?? null,
    state: row.donor?.region ?? null,
    country_code: row.donor?.countryCode ?? row.donorCountryCode ?? null,
    gender: row.donor?.gender ?? null,
    date_of_birth: row.donor?.birthdate ?? null,
    fbp: getStr(attribution, "fbp") ?? null,
    fbc: getStr(attribution, "fbc") ?? null,
    client_ip: getStr(attribution, "client_ip") ?? null,
    user_agent: getStr(attribution, "user_agent") ?? null,
    subscription_id: row.subscriptionId ?? null,
  };
}

function buildContents(row: LoadedDonation) {
  const ids: string[] = [];
  const contents: MetaContent[] = [];
  for (const it of row.items) {
    ids.push(it.campaignId);
    contents.push({
      id: it.campaignId,
      quantity: 1,
      item_price: it.amount,
    });
  }
  for (const ci of row.categoryItems) {
    ids.push(ci.categoryId);
    contents.push({
      id: ci.categoryId,
      quantity: 1,
      item_price: ci.amount,
    });
  }
  if (ids.length === 0) {
    ids.push("donation");
    contents.push({ id: "donation", quantity: 1, item_price: row.amount });
  }
  return { ids, contents };
}

function primaryContentName(row: LoadedDonation): string {
  return (
    row.items[0]?.campaign?.title ??
    row.categoryItems[0]?.category?.name ??
    "Donation"
  );
}

// ─── Success: Donate ──────────────────────────────────────────────────────────

/**
 * Fire Meta CAPI "Donate" + GA4 MP "purchase" for a successfully PAID donation.
 *
 * The browser fbq("track", "Donate", ...) fires from the /success page with
 * the SAME event_id (`donate_<donationId>`) so Meta dedupes the browser↔server
 * pair into one conversion. value/currency come from the donation row in the
 * database — never from a cookie, URL param, or UI state — so what Meta
 * records matches what the dashboard charged.
 *
 * Atomic claim semantics in the function body; if claim fails (another tab,
 * concurrent retry, or already-fired re-visit) we bail out without sending.
 *
 * Returns a result so callers can log it (e.g. /api/donations/:id/track-conversion
 * surfaces this in its JSON response so the browser knows whether to fire fbq).
 */
export async function sendDonationServerConversions(donationId: string): Promise<MetaCapiResult> {
  try {
    const row = await loadDonationForConversion(donationId);
    if (!row) return { ok: false, skipped: true, reason: "donation not found" };

    if (row.status !== "PAID") return { ok: false, skipped: true, reason: `status=${row.status}` };
    if (row.paidAt == null) return { ok: false, skipped: true, reason: "paidAt unset" };
    if (row.conversionEventsSentAt != null) return { ok: false, skipped: true, reason: "already sent" };

    const amount = Number(row.amount ?? row.amountUSD ?? 0);
    if (!(amount > 0)) return { ok: false, skipped: true, reason: "amount <= 0" };

    // ── Atomic claim ─────────────────────────────────────────────────────────
    // Stamp `conversionEventsSentAt` BEFORE sending so two concurrent webhook
    // retries can't both pass the null-check and both fire. If a second caller
    // arrives mid-send, its updateMany matches 0 rows and it bails out.
    const claim = await prisma.donation.updateMany({
      where: {
        id: row.id,
        status: "PAID",
        paidAt: { not: null },
        conversionEventsSentAt: null,
      },
      data: { conversionEventsSentAt: new Date() },
    });
    if (claim.count === 0) {
      return { ok: false, skipped: true, reason: "lost idempotency claim" };
    }

    const creds = await getMetaCapiCredentials();

    const attribution = (row.attribution ?? undefined) as Attribution | undefined;
    const eventSourceUrl = getStr(attribution, "landing_page");
    const eventTime = Math.floor((row.paidAt ?? new Date()).getTime() / 1000);

    // Donation's actual currency — matches what we charged and what the
    // dashboard reports. Meta auto-converts to ad-account currency.
    const currency = row.currency || "USD";
    const contentName = primaryContentName(row);
    const { ids, contents } = buildContents(row);

    // Keep this payload shape in sync with the browser fbq fire in
    // TrackingPixels.tsx `trackDonate` — same shape on both legs gives Meta
    // the cleanest dedup signal. All values are sourced from the DB row.
    const custom_data: MetaCustomData = {
      value: amount,
      currency,
      content_type: "donation",
      content_name: contentName,
      content_category: row.subscriptionId ? "monthly" : "donation",
      content_ids: ids,
      contents,
      num_items: contents.reduce((s, c) => s + (c.quantity ?? 1), 0),
      order_id: row.id,
      transaction_id: row.id,
      status: "paid",
      success: true,
      payment_info_available: 1,
      donation_type: row.subscriptionId ? "MONTHLY" : "ONE_TIME",
      recurring: !!row.subscriptionId,
      payment_method: (row.paymentMethod ?? "CARD").toLowerCase(),
    };

    let metaResult: MetaCapiResult = { ok: false, skipped: true, reason: "no creds" };
    if (creds) {
      metaResult = await sendMetaCapiEvent(
        {
          event_name: "Donate",
          event_id: metaDonationEventId(row.id, "success"),
          event_time: eventTime,
          event_source_url: eventSourceUrl,
          action_source: "website",
          user_data: buildUserDataFromDonation(row),
          custom_data,
        },
        creds
      );
    }

    // GA4 MP "purchase" — independent of Meta success. Idempotent via the same
    // claim above (GA4 dedups by transaction_id=donation.id).
    await sendGa4Purchase(row, amount, currency, contentName, eventTime);

    if (!metaResult.ok && !metaResult.skipped) {
      // Send failed at the Graph endpoint (not a validation skip). Keep the
      // claim stamped — Meta might have received the event before the response
      // failed, so retrying would risk double-counting. Surface loud instead.
      console.error(
        "[conversion] Donate send failed but claim retained:",
        row.id,
        metaResult.error,
        metaResult.fbtrace_id
      );
    }

    return metaResult;
  } catch (e) {
    console.error("[conversion] sendDonationServerConversions", donationId, e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// ─── Failure: DonateFailed ────────────────────────────────────────────────────

/**
 * Fire Meta CAPI "DonateFailed" (custom event) for a donation the bank /
 * Stripe rejected. Server-only. Use case: build a lookalike audience seeded
 * on people who *tried* to donate.
 *
 * "DonateFailed" is intentionally a custom event (not the standard "Donate")
 * so it doesn't pollute the conversion column of the ad-account dashboard.
 * It still flows into Custom Audiences and Lookalike sources.
 */
export async function sendDonationFailedConversions(donationId: string): Promise<MetaCapiResult> {
  try {
    const row = await loadDonationForConversion(donationId);
    if (!row) return { ok: false, skipped: true, reason: "donation not found" };

    if (row.status !== "FAILED") return { ok: false, skipped: true, reason: `status=${row.status}` };
    // Don't seed DonateFailed if the donation later succeeded — protects
    // against flapping webhooks (PayFor fail callback after OK callback).
    if (row.paidAt != null) return { ok: false, skipped: true, reason: "donation later succeeded" };
    if (row.conversionFailedEventsSentAt != null) return { ok: false, skipped: true, reason: "already sent" };

    // ── Atomic claim (mirror of the success path) ─────────────────────────
    const claim = await prisma.donation.updateMany({
      where: {
        id: row.id,
        status: "FAILED",
        paidAt: null,
        conversionFailedEventsSentAt: null,
      },
      data: { conversionFailedEventsSentAt: new Date() },
    });
    if (claim.count === 0) {
      return { ok: false, skipped: true, reason: "lost idempotency claim" };
    }

    const creds = await getMetaCapiCredentials();
    if (!creds) return { ok: false, skipped: true, reason: "no credentials" };

    const attribution = (row.attribution ?? undefined) as Attribution | undefined;
    const eventSourceUrl = getStr(attribution, "landing_page");
    // Use updatedAt for failed donations — closest signal of when the bank
    // rejected. createdAt would back-date the event if the row sat in PENDING.
    const eventTime = Math.floor(
      ((row as { updatedAt?: Date }).updatedAt ?? row.createdAt ?? new Date()).getTime() / 1000
    );

    const amount = Number(row.amount ?? row.amountUSD ?? 0);
    const currency = row.currency || "USD";
    const contentName = primaryContentName(row);
    const { ids, contents } = buildContents(row);

    const custom_data: MetaCustomData = {
      value: amount,
      currency,
      content_type: "product",
      content_name: contentName,
      content_category: row.subscriptionId ? "monthly" : "donation",
      content_ids: ids,
      contents,
      num_items: contents.reduce((s, c) => s + (c.quantity ?? 1), 0),
      order_id: row.id,
      status: "failed",
      donation_type: row.subscriptionId ? "MONTHLY" : "ONE_TIME",
      recurring: !!row.subscriptionId,
      payment_info_available: 1,
      failure_reason: row.providerErrorMessage ?? row.providerTxnResult ?? undefined,
      provider: row.provider ?? undefined,
    };

    const metaResult = await sendMetaCapiEvent(
      {
        event_name: "DonateFailed",
        event_id: metaDonationEventId(row.id, "failed"),
        event_time: eventTime,
        event_source_url: eventSourceUrl,
        user_data: buildUserDataFromDonation(row),
        custom_data,
      },
      creds
    );

    if (!metaResult.ok && !metaResult.skipped) {
      console.error(
        "[conversion] DonateFailed send failed but claim retained:",
        row.id,
        metaResult.error,
        metaResult.fbtrace_id
      );
    }

    return metaResult;
  } catch (e) {
    console.error("[conversion] sendDonationFailedConversions", donationId, e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// ─── Unified dispatcher ──────────────────────────────────────────────────────

/**
 * Single entry point — call this from anywhere a donation's outcome is known
 * and let it pick the right CAPI event based on the current row state.
 *
 * Useful from generic "donation state changed" handlers (e.g. cron sweepers,
 * admin bulk actions) so callers don't have to branch on status themselves.
 */
export async function syncDonationConversion(donationId: string): Promise<MetaCapiResult> {
  const row = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, status: true, paidAt: true },
  });
  if (!row) return { ok: false, skipped: true, reason: "donation not found" };

  if (row.status === "PAID" && row.paidAt != null) {
    return sendDonationServerConversions(donationId);
  }
  if (row.status === "FAILED" && row.paidAt == null) {
    return sendDonationFailedConversions(donationId);
  }
  return { ok: false, skipped: true, reason: `no terminal state (status=${row.status})` };
}

// ─── GA4 (success only) ───────────────────────────────────────────────────────

async function sendGa4Purchase(
  row: LoadedDonation,
  amount: number,
  currency: string,
  contentName: string,
  eventTime: number
): Promise<void> {
  const gaMeasurementId = process.env.GA4_MEASUREMENT_ID;
  const gaApiSecret = process.env.GA4_API_SECRET;
  if (!gaMeasurementId || !gaApiSecret) return;

  const attribution = (row.attribution ?? undefined) as Attribution | undefined;
  const gaClientId = getStr(attribution, "ga_client_id") || `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
  const sessionIdRaw = getStr(attribution, "ga_session_id");
  const sessionNum = sessionIdRaw ? parseInt(sessionIdRaw.replace(/\D/g, "").slice(0, 12), 10) : undefined;

  const items = row.items.map((it) => ({
    item_id: it.campaignId,
    item_name: it.campaign?.title ?? "Donation",
    item_category: "donation",
    price: it.amount,
    quantity: 1,
  }));
  for (const ci of row.categoryItems) {
    items.push({
      item_id: ci.categoryId,
      item_name: ci.category?.name ?? "Category",
      item_category: "donation",
      price: ci.amount,
      quantity: 1,
    });
  }
  if (items.length === 0) {
    items.push({ item_id: "donation", item_name: contentName, item_category: "donation", price: amount, quantity: 1 });
  }

  const gaPayload = {
    client_id: gaClientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: row.id,
          value: amount,
          currency,
          engagement_time_msec: 100,
          affiliation: "Donation Website",
          event_time: eventTime,
          ...(sessionNum != null && !Number.isNaN(sessionNum) ? { session_id: sessionNum } : {}),
          items,
        },
      },
    ],
  };

  try {
    const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(gaMeasurementId)}&api_secret=${encodeURIComponent(gaApiSecret)}`;
    const res = await fetch(gaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gaPayload),
    });
    if (!res.ok) {
      console.error("[conversion] GA4 MP error", await res.text());
    }
  } catch (e) {
    console.error("[conversion] GA4 MP fetch failed", e);
  }
}
