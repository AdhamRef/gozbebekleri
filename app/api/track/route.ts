/**
 * POST /api/track
 *
 * Unified server-side conversion endpoint.
 * Accepts a CanonicalEvent from the browser and:
 *  1. Hashes all PII with SHA-256
 *  2. Forwards to Meta Conversions API
 *  3. Forwards to TikTok Events API
 *
 * The browser already sent the same event to Meta Pixel / TikTok Pixel
 * with the same event_id, so both platforms deduplicate automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { CanonicalEvent } from "@/lib/tracking/canonical";
import { META_EVENT_MAP, TIKTOK_EVENT_MAP } from "@/lib/tracking/canonical";

const FB_API_VERSION = "v21.0";
const TIKTOK_EVENTS_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

// ─── SHA-256 helper (normalise → lowercase → trim) ───────────────────────────
function sha256(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = String(value).trim().toLowerCase();
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const event = (await req.json()) as CanonicalEvent;
    if (!event?.event) {
      return NextResponse.json({ ok: false, reason: "missing event" }, { status: 400 });
    }

    // Real client IP from proxy headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const row = await prisma.trackingSettings.findFirst();

    const results: Record<string, unknown> = {};

    // ── Meta CAPI ─────────────────────────────────────────────────────────────
    if (row?.facebookPixelId && row?.facebookAccessToken) {
      results.meta = await sendMetaCAPI(event, row.facebookPixelId, row.facebookAccessToken, clientIp);
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

// ─── Meta CAPI sender ─────────────────────────────────────────────────────────
async function sendMetaCAPI(
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

  const user_data: Record<string, unknown> = {};
  if (u.email)        user_data.em           = [sha256(u.email)];
  if (u.phone)        user_data.ph           = [sha256(u.phone)];
  if (u.first_name)   user_data.fn           = [sha256(u.first_name)];
  if (u.last_name)    user_data.ln           = [sha256(u.last_name)];
  if (u.city)         user_data.ct           = [sha256(u.city)];
  if (u.state)        user_data.st           = [sha256(u.state)];
  if (u.zip)          user_data.zp           = [sha256(u.zip)];
  if (u.country_code) user_data.country      = [sha256(u.country_code)];
  if (u.external_id)  user_data.external_id  = [sha256(u.external_id)];
  // These are identifiers — not hashed
  if (u.fbp)          user_data.fbp          = u.fbp;
  if (u.fbc)          user_data.fbc          = u.fbc;
  if (u.user_agent)   user_data.client_user_agent = u.user_agent;
  if (clientIp)       user_data.client_ip_address = clientIp;

  const custom_data: Record<string, unknown> = {};
  if (d.amount != null)  custom_data.value    = d.amount_usd ?? d.amount;
  if (d.currency)        custom_data.currency = d.currency;
  if (event.items?.length) {
    custom_data.content_ids = event.items.map((i) => i.item_id);
    custom_data.contents    = event.items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, item_price: i.price ?? 0 }));
    custom_data.num_items   = event.items.reduce((s, i) => s + (i.quantity ?? 1), 0);
  } else if (d.cause_id) {
    custom_data.content_ids = [d.cause_id];
    custom_data.contents    = [{ id: d.cause_id, quantity: 1, item_price: d.amount_usd ?? d.amount ?? 0 }];
  }
  if (d.donation_type)           custom_data.content_type   = "product";
  if (p.transaction_id)          custom_data.order_id       = p.transaction_id;

  const payload = {
    data: [
      {
        event_name:        metaEventName,
        event_time:        event.event_time,
        event_id:          event.event_id,
        action_source:     "website",
        event_source_url:  event.page?.url,
        user_data:         Object.keys(user_data).length ? user_data : undefined,
        custom_data:       Object.keys(custom_data).length ? custom_data : undefined,
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("[Meta CAPI] error:", data?.error?.message);
      return { ok: false, error: data?.error?.message };
    }
    return { ok: true, events_received: data?.events_received };
  } catch (e) {
    console.error("[Meta CAPI] fetch failed:", e);
    return { ok: false, error: "fetch failed" };
  }
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
