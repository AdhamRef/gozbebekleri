/**
 * POST /api/track
 *
 * Server-side mirror for the browser canonical funnel events (PageView,
 * ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, …). The Meta side
 * is sent via the shared CAPI sender so the hashing, payload shape, and creds
 * lookup match what the donation webhook uses.
 *
 * IMPORTANT: We skip donation_complete and payment_failed here — those are
 * owned by the payment-provider webhook in donation-conversion-server.ts so we
 * fire exactly one server-side hit per donation. The webhook uses donation.id
 * as the event_id and the browser-side fbq uses the same id, so Meta dedupes
 * the browser↔server pair into a single conversion. Mirroring those events
 * here too would re-introduce the duplicate-counting that drifts ad-account
 * totals from the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { CanonicalEvent } from "@/lib/tracking/canonical";
import {
  META_EVENT_MAP,
  META_CAPI_WEBHOOK_OWNED,
  TIKTOK_EVENT_MAP,
} from "@/lib/tracking/canonical";
import {
  sendMetaCapiEvent,
  type MetaUserData,
  type MetaCustomData,
} from "@/lib/tracking/meta-capi";

const TIKTOK_EVENTS_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

function sha256(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = String(value).trim().toLowerCase();
  if (!normalised) return undefined;
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const event = (await req.json()) as CanonicalEvent;
    if (!event?.event) {
      return NextResponse.json({ ok: false, reason: "missing event" }, { status: 400 });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const row = await prisma.trackingSettings.findFirst();
    const results: Record<string, unknown> = {};

    // ── Meta CAPI ─────────────────────────────────────────────────────────────
    if (row?.facebookPixelId && row?.facebookAccessToken) {
      if (META_CAPI_WEBHOOK_OWNED.has(event.event)) {
        // donation_complete / payment_failed → webhook owns the server hit.
        results.meta = { skipped: true, owner: "donation-conversion-server" };
      } else {
        results.meta = await mirrorMetaCanonical(event, row.facebookPixelId, row.facebookAccessToken, clientIp);
      }
    }

    // ── TikTok Events API ─────────────────────────────────────────────────────
    if (row?.tiktokPixelId && row?.tiktokAccessToken) {
      results.tiktok = await sendTikTokEvents(event, row.tiktokPixelId, row.tiktokAccessToken, clientIp);
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error("[/api/track] error:", err);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 200 });
  }
}

// ─── Meta canonical-event mirror ─────────────────────────────────────────────

async function mirrorMetaCanonical(
  event: CanonicalEvent,
  pixelId: string,
  accessToken: string,
  clientIp?: string
) {
  const metaEventName = META_EVENT_MAP[event.event];
  if (!metaEventName) return { skipped: true };

  const u = event.user ?? {};
  const d = event.donation ?? {};
  const p = event.payment ?? {};

  const user_data: MetaUserData = {
    email: u.email ?? null,
    phone: u.phone ?? null,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    city: u.city ?? null,
    state: u.state ?? null,
    zip: u.zip ?? null,
    country_code: u.country_code ?? null,
    external_id: u.external_id ?? null,
    gender: u.gender ?? null,
    date_of_birth: u.date_of_birth ?? null,
    fbp: u.fbp ?? null,
    fbc: u.fbc ?? null,
    client_ip: clientIp ?? null,
    user_agent: u.user_agent ?? null,
    subscription_id: u.subscription_id ?? null,
  };

  const custom_data: MetaCustomData = {};
  if (d.amount != null) custom_data.value = d.amount;
  if (d.currency) custom_data.currency = d.currency;
  if (event.items?.length) {
    custom_data.content_ids = event.items.map((i) => i.item_id);
    custom_data.contents = event.items.map((i) => ({
      id: i.item_id,
      quantity: i.quantity ?? 1,
      item_price: i.price ?? 0,
    }));
    custom_data.num_items = event.items.reduce((s, i) => s + (i.quantity ?? 1), 0);
  } else if (d.cause_id) {
    custom_data.content_ids = [d.cause_id];
    custom_data.contents = [{ id: d.cause_id, quantity: 1, item_price: d.amount ?? d.amount_usd ?? 0 }];
    custom_data.num_items = 1;
  }
  custom_data.content_type = "product";
  if (d.content_name ?? d.cause_name) custom_data.content_name = d.content_name ?? d.cause_name;
  if (d.content_category ?? d.donation_type) {
    custom_data.content_category = d.content_category ?? d.donation_type?.toLowerCase();
  }
  if (d.description) custom_data.description = d.description;
  if (d.status) custom_data.status = d.status;
  if (d.payment_info_available != null) custom_data.payment_info_available = d.payment_info_available;
  if (d.predicted_ltv != null) custom_data.predicted_ltv = d.predicted_ltv;
  if (p.transaction_id) custom_data.order_id = p.transaction_id;

  return sendMetaCapiEvent(
    {
      event_name: metaEventName,
      event_id: event.event_id,
      event_time: event.event_time,
      event_source_url: event.page?.url,
      user_data,
      custom_data,
    },
    { pixelId, accessToken }
  );
}

// ─── TikTok Events API sender ─────────────────────────────────────────────────
async function sendTikTokEvents(
  event: CanonicalEvent,
  pixelCode: string,
  accessToken: string,
  clientIp?: string
) {
  const tiktokEventName = TIKTOK_EVENT_MAP[event.event];
  if (!tiktokEventName) return { skipped: true };

  const u = event.user ?? {};
  const d = event.donation ?? {};
  const p = event.payment ?? {};

  const payload = {
    pixel_code: pixelCode,
    event:      tiktokEventName,
    event_id:   event.event_id,
    timestamp:  new Date(event.event_time * 1000).toISOString(),
    context: {
      page: {
        url:      event.page?.url,
        referrer: event.page?.referrer,
      },
      user: {
        external_id:   u.external_id ? sha256(u.external_id) : undefined,
        email:         u.email       ? sha256(u.email)        : undefined,
        phone_number:  u.phone       ? sha256(u.phone)        : undefined,
        ttclid:        u.fbc ?? event.session?.ttclid,
        ip:            clientIp,
        user_agent:    u.user_agent,
      },
    },
    properties: {
      value:      d.amount_usd ?? d.amount,
      currency:   d.currency,
      content_id: event.items?.[0]?.item_id ?? d.cause_id ?? p.transaction_id,
      content_ids: event.items?.map((i) => i.item_id),
      content_name: d.cause_name ?? event.items?.[0]?.item_name,
      content_type: "product",
      order_id:    p.transaction_id,
      quantity:    event.items?.reduce((s, i) => s + (i.quantity ?? 1), 0) ?? 1,
    },
  };

  try {
    const res = await fetch(TIKTOK_EVENTS_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Access-Token":  accessToken,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.code !== 0) {
      console.error("[TikTok Events] error:", data?.message);
      return { ok: false, error: data?.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("[TikTok Events] fetch failed:", e);
    return { ok: false, error: "fetch failed" };
  }
}
