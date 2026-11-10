import type { Prisma } from "@prisma/client";

export const DONATION_ATTRIBUTION_KEYS = [
  "source_capture",
  "source_captured_at",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_group_id",
  "ad_group_name",
  "ad_id",
  "ad_name",
  "creative_id",
  "creative_name",
  "placement",
  "publisher_platform",
  "site_source_name",
  "platform",
  "device",
  "device_platform",
  "network",
  "matchtype",
  "keyword",
  "target_id",
  "loc_interest",
  "loc_physical",
  "audience_type",
  "audience_segment",
  "message_variant",
  "channel",
  "twilio_campaign_id",
  "twilio_template_id",
  "target_country",
  "target_region",
  "language",
  "locale",
  "currency",
  "funnel",
  "objective",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "twclid",
  "fbp",
  "fbc",
  "ga_client_id",
  "ga_session_id",
  "session_id",
  "landing_page",
  "first_landing_page",
  "conversion_page",
  "referrer",
  "first_referrer",
  "_ga",
  "user_agent",
  "client_ip",
  "country_code",
  "country",
  "city",
  "region",
  "state",
  "zip",
  "postal_code",
  "tracking_quality_warnings",
] as const;

export type DonationAttributionKey = (typeof DONATION_ATTRIBUTION_KEYS)[number];

/**
 * Landing URLs can contain guest receipt credentials (e.g. /success?id=...&t=...).
 * Strip them before persisting attribution, rendering clickable URLs, or
 * forwarding event_source_url to ad networks. Do not remove campaign UTMs.
 */
const PRIVATE_URL_PARAMETER = /^(?:t|token|access_?token|auth(?:_token)?|authorization|secret|key|api_?key|session_?token|code|password|passcode|otp|jwt|ticket)$/i;
const ATTRIBUTION_URL_KEYS = new Set(["landing_page", "first_landing_page", "conversion_page", "referrer", "first_referrer", "ga_landing_page", "ga_referrer"]);

export function safeAttributionUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (PRIVATE_URL_PARAMETER.test(key)) url.searchParams.delete(key);
    }
    return url.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

export function isPaymentReturnPage(value: unknown): boolean {
  const safe = safeAttributionUrl(value);
  if (!safe) return false;
  const segments = new URL(safe).pathname.toLowerCase().split("/").filter(Boolean);
  return segments.some(segment => /^(?:success|thank-you|thankyou|payment-success|payment-failed|payment-failure|payment-processing|donation-success|donation-failed)$/.test(segment));
}

function isSiteLanding(value: string): boolean {
  const host = new URL(value).hostname.toLowerCase();
  return host === "gozbebekleri.org" || host === "www.gozbebekleri.org";
}

/** Prefer a verified site entry page; a bank/receipt return is NOT acquisition. */
export function safeAcquisitionLandingPage(attribution: Record<string, unknown> | null | undefined): string | null {
  for (const candidate of [attribution?.landing_page, attribution?.first_landing_page]) {
    const safe = safeAttributionUrl(candidate);
    if (safe && !isPaymentReturnPage(safe) && isSiteLanding(safe)) return safe;
  }
  return null;
}

const MACRO_PATTERNS = ["{{", "}}", "__CAMPAIGN_", "__ADGROUP_", "__AD_", "__PLACEMENT_", "__CREATIVE_"];

function hasUnresolvedMacro(value: string): boolean {
  return MACRO_PATTERNS.some((pattern) => value.includes(pattern));
}

function normalizeLanguage(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  const aliases: Record<string, string> = {
    arabic: "ar",
    ar: "ar",
    english: "en",
    en: "en",
    french: "fr",
    fr: "fr",
    turkish: "tr",
    tr: "tr",
    indonesian: "id",
    id: "id",
    portuguese: "pt",
    pt: "pt",
    spanish: "es",
    es: "es",
  };
  return aliases[v] ?? (v.length <= 8 ? v : undefined);
}

function normalizePlatform(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  const aliases: Record<string, string> = {
    facebook: "meta",
    fb: "meta",
    instagram: "meta",
    meta: "meta",
    google: "google_ads",
    googleads: "google_ads",
    google_ads: "google_ads",
    tiktok: "tiktok",
    x: "x",
    twitter: "x",
    twilio: "twilio",
    whatsapp: "whatsapp",
    sms: "sms",
    email: "email",
  };
  return aliases[v] ?? v.slice(0, 80);
}

function normalizeCountry(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  return v.length === 2 ? v.toUpperCase() : v.slice(0, 80);
}

function qualityWarnings(out: Record<string, string>): string[] {
  const warnings: string[] = [];
  for (const [key, value] of Object.entries(out)) {
    if (key.endsWith("_unresolved") || hasUnresolvedMacro(value)) warnings.push(`unresolved_macro:${key.replace(/_unresolved$/, "")}`);
  }
  const platform = normalizePlatform(out.platform ?? out.utm_source);
  if (platform === "meta" && !out.fbclid && !out.fbc && !out.fbp) warnings.push("meta_missing_fb_click_ids");
  if (platform === "google_ads" && !out.gclid && !out.gbraid && !out.wbraid) warnings.push("google_missing_click_ids");
  if (platform === "tiktok" && !out.ttclid) warnings.push("tiktok_missing_ttclid");
  if (platform === "x" && !out.twclid) warnings.push("x_missing_twclid");
  return warnings;
}

export function sanitizeDonationAttribution(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of DONATION_ATTRIBUTION_KEYS) {
    const v = src[key];
    if (v == null) continue;
    const s = typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
    if (!s) continue;
    if (hasUnresolvedMacro(s)) {
      out[`${key}_unresolved`] = "true";
      continue;
    }
    const cleaned = ATTRIBUTION_URL_KEYS.has(key) ? safeAttributionUrl(s) : s;
    if (!cleaned) continue;
    out[key] = cleaned.slice(0, 2048);
  }

  // Legacy donation rows can incorrectly contain /success?t=... as landing_page.
  // Correct only the view-only acquisition fields; preserve a sanitized
  // conversion_page for funnel diagnostics without receipt credentials.
  const acquisition = safeAcquisitionLandingPage(out);
  if (acquisition) out.landing_page = acquisition;
  else delete out.landing_page;
  if (out.first_landing_page && isPaymentReturnPage(out.first_landing_page)) delete out.first_landing_page;

  const lang = normalizeLanguage(out.language ?? out.locale);
  if (lang) {
    out.language = lang;
    out.locale = out.locale || lang;
  }
  if (out.currency) out.currency = out.currency.toUpperCase().slice(0, 3);
  const targetCountry = normalizeCountry(out.target_country ?? out.country_code ?? out.country);
  if (targetCountry) out.target_country = targetCountry;
  const platform = normalizePlatform(out.platform ?? out.publisher_platform ?? out.site_source_name ?? out.utm_source);
  if (platform) out.platform = platform;

  const warnings = qualityWarnings(out);
  if (warnings.length) out.tracking_quality_warnings = warnings.join(",");

  return Object.keys(out).length > 0 ? out : undefined;
}
