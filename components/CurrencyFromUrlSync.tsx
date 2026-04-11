"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  isValidCurrencyParam,
  normalizeCurrencyParamToCookie,
} from "@/lib/currency-link";

export const CURRENCY_COOKIE_UPDATED_EVENT = "app:currency-cookie-updated";

/** Lets client UI (e.g. `CurrencySelector`) react without a full page refresh. */
function dispatchCurrencyCookieUpdated(code: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CURRENCY_COOKIE_UPDATED_EVENT, { detail: { code } })
  );
}

/**
 * Syncs `?currency=` from the URL into the `currency` cookie (same as `CurrencySelector`),
 * and notifies listeners so the selector updates immediately on client navigation.
 * When there is no URL param, ensures a default cookie (`USD`) if none is set.
 */
export function CurrencyFromUrlSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get("currency");
    if (raw && isValidCurrencyParam(raw)) {
      const normalized = normalizeCurrencyParamToCookie(raw);
      if (Cookies.get("currency") !== normalized) {
        Cookies.set("currency", normalized, { expires: 365 });
      }
      dispatchCurrencyCookieUpdated(normalized);
      return;
    }
    if (!Cookies.get("currency")) {
      Cookies.set("currency", "USD", { expires: 365 });
      dispatchCurrencyCookieUpdated("USD");
    }
  }, [searchParams]);

  return null;
}
