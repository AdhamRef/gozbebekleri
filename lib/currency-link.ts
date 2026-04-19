import Cookies from "js-cookie";

/** Matches `CurrencySelector` codes (uppercase in URLs). */
export const ALLOWED_URL_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "TRY",
  "SAR",
  "AED",
  "KWD",
  "EGP",
  "QAR",
  "BHD",
  "JOD",
  "MAD",
  "DEFAULT",
]);

/** Stable list for dashboards / link builders (order matches typical UX). */
export const URL_CURRENCY_CODES_ORDERED = [
  "DEFAULT",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "TRY",
  "SAR",
  "AED",
  "KWD",
  "QAR",
  "BHD",
  "JOD",
  "MAD",
  "EGP",
] as const;

const COOKIE_DEFAULT = "DEFAULT";

/**
 * Cookie "DEFAULT" (site default display) → USD in shared links.
 * Missing cookie → USD.
 */
export function currencyCodeForUrl(cookieValue: string | undefined): string {
  const raw = (cookieValue ?? "").trim();
  if (!raw || raw === COOKIE_DEFAULT) return "USD";
  return raw.toUpperCase();
}

export function getCurrencyCodeForLinks(): string {
  return currencyCodeForUrl(Cookies.get("currency"));
}

export function isValidCurrencyParam(value: string | null | undefined): value is string {
  if (!value) return false;
  return ALLOWED_URL_CURRENCIES.has(value.toUpperCase());
}

/** Persist URL param into the same codes used by `CurrencySelector` / cookies. */
export function normalizeCurrencyParamToCookie(value: string): string {
  const u = value.toUpperCase();
  return ALLOWED_URL_CURRENCIES.has(u) ? u : "USD";
}

export function appendCurrencyQuery(href: string, currency: string): string {
  if (!href) return href;
  const lower = href.toLowerCase();
  if (lower.startsWith("mailto:") || lower.startsWith("tel:") || lower.startsWith("javascript:")) {
    return href;
  }
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const u = new URL(href);
      u.searchParams.set("currency", currency);
      return u.toString();
    } catch {
      return href;
    }
  }
  const hashIdx = href.indexOf("#");
  const base = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const qIdx = base.indexOf("?");
  const path = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const qs = qIdx >= 0 ? base.slice(qIdx + 1) : "";
  const params = new URLSearchParams(qs);
  params.set("currency", currency);
  const q = params.toString();
  return `${path}?${q}${hash}`;
}

export function mergeCurrencyIntoHref(
  href: string | Record<string, unknown>,
  currency: string
): string | Record<string, unknown> {
  if (typeof href === "string") return appendCurrencyQuery(href, currency);
  const o = href as Record<string, unknown>;
  const q = o.query;
  const nextQuery =
    typeof q === "object" && q !== null && !Array.isArray(q)
      ? { ...(q as Record<string, unknown>), currency }
      : { currency };
  return { ...o, query: nextQuery };
}
