"use client";

import { DONATION_ATTRIBUTION_KEYS, type DonationAttributionKey } from "./sanitize";

const PREFIX = "ala_attr_";
const MAX_AGE_DAYS = 30;

function setCookie(name: string, value: string) {
  const expires = new Date(Date.now() + MAX_AGE_DAYS * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function getCookie(name: string): string | undefined {
  const hit = document.cookie.split("; ").find((row) => row.startsWith(`${encodeURIComponent(name)}=`));
  if (!hit) return undefined;
  try {
    return decodeURIComponent(hit.split("=").slice(1).join("="));
  } catch {
    return undefined;
  }
}

/** Capture URL params + click IDs into cookies (call once on app load / route change). */
export function captureAttributionFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const keys: DonationAttributionKey[] = [...DONATION_ATTRIBUTION_KEYS];
  for (const key of keys) {
    const fromUrl = params.get(key);
    if (fromUrl) setCookie(PREFIX + key, fromUrl);
  }
  // fbclid → build fbc if missing (browser Meta cookie pattern)
  const fbclid = params.get("fbclid");
  if (fbclid && !getCookie(PREFIX + "fbc")) {
    setCookie(PREFIX + "fbc", `fb.1.${Date.now()}.${fbclid}`);
  }
  if (!getCookie(PREFIX + "landing_page")) {
    setCookie(PREFIX + "landing_page", window.location.href.split("#")[0].slice(0, 2048));
  }
  if (!getCookie(PREFIX + "referrer") && document.referrer) {
    setCookie(PREFIX + "referrer", document.referrer.slice(0, 2048));
  }
}

/** Read raw cookie by name (not prefixed). Used to pick up _fbp / _fbc that
 *  the Meta Pixel script writes — those are the values CAPI needs for
 *  browser↔server match quality, and we won't have them unless we read the
 *  real cookies. */
function getRawCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!hit) return undefined;
  try {
    return decodeURIComponent(hit.split("=").slice(1).join("="));
  } catch {
    return undefined;
  }
}

/**
 * Build the attribution payload persisted onto the donation row at create
 * time. Two sources are merged:
 *   1. The `ala_attr_*` cookies populated by `captureAttributionFromUrl`
 *      (UTM params, click IDs from the landing URL).
 *   2. The real `_fbp` / `_fbc` cookies written by fbevents.js — these are
 *      the SAME values Meta dedupes browser↔server CAPI on, and dropping
 *      them tanks match quality (the user's CAPI sample explicitly lists
 *      `fbp` + `fbc` in user_data). The browser pixel always knows them;
 *      we just have to forward.
 * Per-key precedence: explicit URL-captured value > Meta cookie value, so
 * a fresh `?fbclid=` landing still wins.
 */
export function getDonationAttributionPayload(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const out: Record<string, string> = {};
  for (const key of DONATION_ATTRIBUTION_KEYS) {
    const v = getCookie(PREFIX + key);
    if (v) out[key] = v;
  }
  if (!out.fbp) {
    const fbp = getRawCookie("_fbp");
    if (fbp) out.fbp = fbp;
  }
  if (!out.fbc) {
    const fbc = getRawCookie("_fbc");
    if (fbc) out.fbc = fbc;
  }
  if (!out.ga_client_id) {
    // _ga cookie format: "GA1.1.<clientId.timestamp>" — the GA4 MP payload
    // wants just the clientId.timestamp part.
    const ga = getRawCookie("_ga");
    if (ga) {
      const m = ga.match(/^GA\d\.\d\.(.+)$/);
      if (m) out.ga_client_id = m[1];
    }
  }
  return out;
}
