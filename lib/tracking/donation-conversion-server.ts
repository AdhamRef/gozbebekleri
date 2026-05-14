/**
 * Server-side conversion senders for donations.
 *
 * Single source of truth for Meta CAPI Donate / DonateFailed events. Fired from
 * the payment provider callbacks (PayFor OK/Fail, Stripe webhook, the explicit
 * /api/donations/:id/fail PATCH) so the dashboard's PAID/FAILED rows and Meta's
 * reported conversions stay 1:1 — exactly one CAPI event per donation, ever.
 *
 * Browser-side fbq fires the same event_name with the same eventID (donation.id
 * for success, donation.id + "_failed" for failure) so Meta auto-deduplicates
 * the browser-pixel hit against the server-side hit. Without that pairing Meta
 * counts each donation twice and the ad-account totals diverge from the site.
 *
 * Idempotency:
 *   - Success path keys off `conversionEventsSentAt`.
 *   - Failure path keys off `conversionFailedEventsSentAt`.
 *   The row is also locked to status PAID / FAILED before we send, so a flapping
 *   webhook can't fire DonateFailed for a donation that later succeeds.
 */

import { prisma } from "@/lib/prisma";
import {
  getMetaCapiCredentials,
  sendMetaCapiEvent,
  type MetaUserData,
  type MetaCustomData,
  type MetaContent,
} from "@/lib/tracking/meta-capi";

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
 * Browser-side fbq fires "Donate" with eventID = donation.id (see
 * TrackingPixels.trackDonate). Using the same event_id here lets Meta dedupe
 * the two hits so reports show 1× per donation, matching the dashboard.
 */
export async function sendDonationServerConversions(donationId: string): Promise<void> {
  try {
    const row = await loadDonationForConversion(donationId);
    if (!row) return;
    if (row.status !== "PAID" || row.paidAt == null) return;
    if (row.conversionEventsSentAt != null) return;

    const credsPromise = getMetaCapiCredentials();

    const attribution = (row.attribution ?? undefined) as Attribution | undefined;
    const eventSourceUrl = getStr(attribution, "landing_page");
    const eventTime = Math.floor((row.paidAt ?? new Date()).getTime() / 1000);

    // Use the donation's ACTUAL currency + amount (matches what we charged and
    // what the dashboard reports). Meta auto-converts to ad-account currency.
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
      status: "completed",
      donation_type: row.subscriptionId ? "MONTHLY" : "ONE_TIME",
      recurring: !!row.subscriptionId,
      payment_info_available: 1,
    };

    const creds = await credsPromise;
    if (creds) {
      await sendMetaCapiEvent(
        {
          event_name: "Donate",
          event_id: row.id,
          event_time: eventTime,
          event_source_url: eventSourceUrl,
          user_data: buildUserDataFromDonation(row),
          custom_data,
        },
        creds
      );
    }

    await sendGa4Purchase(row, amount, currency, contentName, eventTime);

    await prisma.donation.update({
      where: { id: donationId },
      data: { conversionEventsSentAt: new Date() },
    });
  } catch (e) {
    console.error("[conversion] sendDonationServerConversions", e);
  }
}

// ─── Failure: DonateFailed ────────────────────────────────────────────────────

/**
 * Fire Meta CAPI "DonateFailed" (custom event) for a donation that the bank /
 * Stripe rejected. Use case from marketing: build a lookalike audience seeded
 * on people who *tried* to donate. They're the right segment — the only thing
 * that stopped them was the card.
 *
 * "DonateFailed" is intentionally a custom event (not the standard "Donate")
 * so it doesn't pollute the conversion column of the ad-account dashboard.
 * It still flows into Custom Audiences and Lookalike sources.
 */
export async function sendDonationFailedConversions(donationId: string): Promise<void> {
  try {
    const row = await loadDonationForConversion(donationId);
    if (!row) return;
    // Don't seed DonateFailed if the donation later succeeded — protects against
    // flapping webhooks (e.g. PayFor fail callback fires after OK callback).
    if (row.status !== "FAILED" || row.paidAt != null) return;
    if (row.conversionFailedEventsSentAt != null) return;

    const creds = await getMetaCapiCredentials();
    if (!creds) return;

    const attribution = (row.attribution ?? undefined) as Attribution | undefined;
    const eventSourceUrl = getStr(attribution, "landing_page");
    const eventTime = Math.floor(((row as { updatedAt?: Date }).updatedAt ?? row.createdAt ?? new Date()).getTime() / 1000);

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

    await sendMetaCapiEvent(
      {
        event_name: "DonateFailed",
        event_id: `${row.id}_failed`,
        event_time: eventTime,
        event_source_url: eventSourceUrl,
        user_data: buildUserDataFromDonation(row),
        custom_data,
      },
      creds
    );

    await prisma.donation.update({
      where: { id: donationId },
      data: { conversionFailedEventsSentAt: new Date() },
    });
  } catch (e) {
    console.error("[conversion] sendDonationFailedConversions", e);
  }
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
