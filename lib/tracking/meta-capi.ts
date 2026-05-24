/**
 * Shared Meta Conversions API sender.
 *
 * One canonical place to:
 *   1. Hash PII (SHA-256, lowercased+trimmed) per Meta's Advanced Matching spec.
 *   2. Build user_data + custom_data payloads.
 *   3. POST to the Graph events endpoint with strict pre-send validation.
 *
 * Used by:
 *   - /api/track       → mirrors browser-side canonical funnel events (PageView,
 *                        ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, …).
 *                        donation_complete / payment_failed are REFUSED here —
 *                        the dedicated paths below own those server legs.
 *   - /api/donations/:id/track-conversion → fires Donate from the /success
 *                        page request, gated by an atomic claim on
 *                        `conversionEventsSentAt`. Browser fbq fires the same
 *                        event_id; Meta dedups the pair.
 *   - donation-conversion-server.ts → fires DonateFailed (custom event,
 *                        lookalike-seed for abandoned card attempts) from the
 *                        payment-provider callbacks. Failed donors typically
 *                        never reach a /success-style page, so this leg has to
 *                        stay server-only.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const FB_API_VERSION = "v21.0";

/**
 * Meta rejects events older than 7 days from the Graph endpoint. We refuse
 * them client-side so a stale webhook retry can't quietly fail at Meta.
 */
const MAX_EVENT_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country_code?: string | null;
  external_id?: string | null;
  gender?: string | null;          // "male" | "female" | "m" | "f"
  date_of_birth?: string | null;   // YYYY-MM-DD or YYYYMMDD
  // Non-hashed identifiers
  fbp?: string | null;
  fbc?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  subscription_id?: string | null;
}

export interface MetaContent {
  id: string;
  quantity?: number;
  item_price?: number;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  contents?: MetaContent[];
  num_items?: number;
  content_type?: string;
  content_name?: string;
  content_category?: string;
  description?: string;
  order_id?: string;
  status?: string;
  predicted_ltv?: number;
  // Free-form pass-through (e.g. donation_type, recurring, failure_reason)
  [key: string]: unknown;
}

export interface MetaCapiEvent {
  event_name: string;
  event_id: string;
  event_time?: number;            // unix seconds; defaults to now
  event_source_url?: string;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  test_event_code?: string;       // for Events Manager → Test Events tab
  action_source?: "website" | "email" | "app" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other";
}

export interface MetaCapiResult {
  ok: boolean;
  events_received?: number;
  fbtrace_id?: string;
  event_name?: string;
  event_id?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

function sha256(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = String(value).trim().toLowerCase();
  if (!normalised) return undefined;
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

/** Phone → digits only, sha256. Meta wants E.164 digits without "+". */
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return undefined;
  return crypto.createHash("sha256").update(digits).digest("hex");
}

/** Gender → "m" / "f" → sha256. */
function hashGender(gender: string | null | undefined): string | undefined {
  if (!gender) return undefined;
  const g = String(gender).trim().toLowerCase();
  const norm = g === "m" || g === "male" ? "m" : g === "f" || g === "female" ? "f" : undefined;
  if (!norm) return undefined;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

/** DOB → "YYYYMMDD" → sha256. */
function hashDob(dob: string | null | undefined): string | undefined {
  if (!dob) return undefined;
  const digits = String(dob).replace(/\D/g, "");
  if (digits.length < 8) return undefined;
  return crypto.createHash("sha256").update(digits.slice(0, 8)).digest("hex");
}

/** Lowercase country code → 2 chars → sha256. */
function hashCountry(cc: string | null | undefined): string | undefined {
  if (!cc) return undefined;
  const norm = String(cc).trim().toLowerCase();
  if (!norm) return undefined;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

/** Build the hashed `user_data` block from a MetaUserData input. */
export function buildMetaUserData(u: MetaUserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const em = sha256(u.email);
  if (em) out.em = [em];
  const ph = hashPhone(u.phone);
  if (ph) out.ph = [ph];
  const fn = sha256(u.first_name);
  if (fn) out.fn = [fn];
  const ln = sha256(u.last_name);
  if (ln) out.ln = [ln];
  const ct = sha256(u.city);
  if (ct) out.ct = [ct];
  const st = sha256(u.state);
  if (st) out.st = [st];
  const zp = sha256(u.zip);
  if (zp) out.zp = [zp];
  const country = hashCountry(u.country_code);
  if (country) out.country = [country];
  const external_id = sha256(u.external_id);
  if (external_id) out.external_id = [external_id];
  const ge = hashGender(u.gender);
  if (ge) out.ge = [ge];
  const db = hashDob(u.date_of_birth);
  if (db) out.db = [db];

  // Non-hashed identifiers
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  if (u.user_agent) out.client_user_agent = String(u.user_agent).slice(0, 512);
  if (u.client_ip) {
    // Strip anything that isn't valid IPv4/IPv6 characters
    const ip = String(u.client_ip).replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45);
    if (ip) out.client_ip_address = ip;
  }
  if (u.subscription_id) out.subscription_id = u.subscription_id;

  return out;
}

// ─── Sender ───────────────────────────────────────────────────────────────────

interface MetaCapiCredentials {
  pixelId: string;
  accessToken: string;
}

/** Read Meta CAPI credentials from the dashboard TrackingSettings row.
 *  Falls back to env vars (legacy) when the row is missing. */
export async function getMetaCapiCredentials(): Promise<MetaCapiCredentials | null> {
  const row = await prisma.trackingSettings.findFirst();
  const pixelId = row?.facebookPixelId || process.env.META_PIXEL_ID || null;
  const accessToken = row?.facebookAccessToken || process.env.META_ACCESS_TOKEN || null;
  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken };
}

/** Validate an event before sending. Returns reason for rejection or null. */
function validateEvent(event: MetaCapiEvent): string | null {
  if (!event.event_name) return "missing event_name";
  if (!event.event_id) return "missing event_id";

  const eventTime = event.event_time ?? Math.floor(Date.now() / 1000);
  const ageSeconds = Math.floor(Date.now() / 1000) - eventTime;
  if (ageSeconds > MAX_EVENT_AGE_SECONDS) {
    return `event too old (${Math.floor(ageSeconds / 86400)}d) — Meta rejects > 7d`;
  }
  if (eventTime > Math.floor(Date.now() / 1000) + 60) {
    // small clock-skew tolerance
    return "event_time is in the future";
  }
  return null;
}

export async function sendMetaCapiEvent(
  event: MetaCapiEvent,
  creds?: MetaCapiCredentials
): Promise<MetaCapiResult> {
  const c = creds ?? (await getMetaCapiCredentials());
  if (!c) return { skipped: true, ok: false, reason: "no credentials" };

  const validationError = validateEvent(event);
  if (validationError) {
    console.warn("[Meta CAPI] rejected event:", event.event_name, event.event_id, validationError);
    return { ok: false, skipped: true, reason: validationError, event_name: event.event_name, event_id: event.event_id };
  }

  const user_data = buildMetaUserData(event.user_data);
  if (Object.keys(user_data).length === 0) {
    // Meta rejects events without at least one user identifier. Refuse here
    // so we don't waste a Graph round-trip and don't spam the error log.
    return {
      ok: false,
      skipped: true,
      reason: "no user identifiers",
      event_name: event.event_name,
      event_id: event.event_id,
    };
  }

  const eventBlock: Record<string, unknown> = {
    event_name: event.event_name,
    event_time: event.event_time ?? Math.floor(Date.now() / 1000),
    event_id: event.event_id,
    action_source: event.action_source ?? "website",
    user_data,
  };
  if (event.event_source_url) eventBlock.event_source_url = event.event_source_url;
  if (event.custom_data && Object.keys(event.custom_data).length > 0) {
    eventBlock.custom_data = event.custom_data;
  }

  const payload: Record<string, unknown> = { data: [eventBlock] };
  if (event.test_event_code) payload.test_event_code = event.test_event_code;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${c.pixelId}/events?access_token=${encodeURIComponent(c.accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message?: string; type?: string; code?: number };
    };
    if (!res.ok) {
      console.error(
        "[Meta CAPI]",
        event.event_name,
        event.event_id,
        `status=${res.status}`,
        "error:",
        data?.error?.message ?? "unknown",
        "fbtrace_id:",
        data?.fbtrace_id ?? "n/a"
      );
      return {
        ok: false,
        error: data?.error?.message,
        fbtrace_id: data?.fbtrace_id,
        event_name: event.event_name,
        event_id: event.event_id,
      };
    }
    return {
      ok: true,
      events_received: data?.events_received,
      fbtrace_id: data?.fbtrace_id,
      event_name: event.event_name,
      event_id: event.event_id,
    };
  } catch (e) {
    console.error("[Meta CAPI]", event.event_name, event.event_id, "fetch failed:", e);
    return {
      ok: false,
      error: "fetch failed",
      event_name: event.event_name,
      event_id: event.event_id,
    };
  }
}
