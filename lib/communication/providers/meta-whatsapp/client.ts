import { mapGraphError, META_REASONS } from "./errors";
import type { HealthResult, MetaGraphConfig } from "./types";

/**
 * Meta WhatsApp Cloud API client — server-only credential resolution + Graph fetch.
 * Credentials come from the environment; tokens are never returned to callers, logged, or thrown.
 */

export function getMetaConfig(): MetaGraphConfig | null {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;
  return {
    accessToken,
    graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
    appSecret: process.env.META_WHATSAPP_APP_SECRET?.trim() || null,
    verifyToken: process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || null,
    defaultPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null,
  };
}

export function isMetaConfigured(): boolean {
  return getMetaConfig() !== null;
}

type GraphOk = { ok: true; data: unknown };
type GraphErr = { ok: false; reason: string; detail: string };

/** Low-level Graph API call. Adds the Bearer token; maps failures to safe reasons. */
export async function graphFetch(config: MetaGraphConfig, path: string, init?: RequestInit): Promise<GraphOk | GraphErr> {
  const url = `https://graph.facebook.com/${config.graphVersion}/${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const { reason, detail } = mapGraphError(res.status, body);
      return { ok: false, reason, detail };
    }
    return { ok: true, data: body };
  } catch {
    // Never include the token or raw error object.
    return { ok: false, reason: META_REASONS.REQUEST_FAILED, detail: "network error" };
  }
}

/** Sender readiness check. Uses the sender's phoneNumberId (multi-number aware). */
export async function healthCheck(phoneNumberId?: string | null): Promise<HealthResult> {
  const config = getMetaConfig();
  if (!config) return { ok: false, reason: META_REASONS.NOT_CONFIGURED };
  const pnid = phoneNumberId || config.defaultPhoneNumberId;
  if (!pnid) return { ok: false, reason: META_REASONS.SENDER_MISSING_PHONE_NUMBER_ID };
  const result = await graphFetch(config, `${pnid}?fields=verified_name,quality_rating,display_phone_number`, { method: "GET" });
  if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };
  const d = (result.data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    displayPhoneNumber: typeof d.display_phone_number === "string" ? d.display_phone_number : null,
    qualityRating: typeof d.quality_rating === "string" ? d.quality_rating : null,
    verifiedName: typeof d.verified_name === "string" ? d.verified_name : null,
  };
}
