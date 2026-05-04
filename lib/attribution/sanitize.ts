import type { Prisma } from "@prisma/client";

/** Keys persisted from landing URL / cookies / client into Donation.attribution */
export const DONATION_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "campaign_id",
  "adset_id",
  "ad_id",
  "placement",
  "device",
  "platform",
  "audience_type",
  "target_country",
  "target_region",
  "language",
  "funnel",
  "objective",
  "fbclid",
  "gclid",
  "fbp",
  "fbc",
  "ga_client_id",
  "ga_session_id",
  "landing_page",
  "referrer",
  "ttclid",
  "_ga",
  "user_agent",
  "client_ip",
] as const;

export type DonationAttributionKey = (typeof DONATION_ATTRIBUTION_KEYS)[number];

export function sanitizeDonationAttribution(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of DONATION_ATTRIBUTION_KEYS) {
    const v = src[key];
    if (v == null) continue;
    const s = typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
    if (s) out[key] = s.slice(0, 2048);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
