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

/** Read cookies into payload for POST /api/donations */
export function getDonationAttributionPayload(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const out: Record<string, string> = {};
  for (const key of DONATION_ATTRIBUTION_KEYS) {
    const v = getCookie(PREFIX + key);
    if (v) out[key] = v;
  }
  return out;
}
