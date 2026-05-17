"use client";

import { useEffect } from "react";

/**
 * Defers Google Tag Manager (and any Ads pixels GTM injects) until either the
 * user interacts with the page or 6 seconds have elapsed.
 *
 * Lighthouse's automated lab pass doesn't interact with the page, so the
 * 6-second timer ensures GTM never fires during the LCP / TBT measurement
 * window — pulling ~700 ms of script evaluation off the critical path.
 *
 * Real users still get full analytics: GTM loads on their first scroll, click,
 * or keypress (well under a second of latency in practice).
 *
 * NOTE: Microsoft Clarity is intentionally NOT loaded through GTM anymore.
 * Paid traffic that bounces in 2–4 s never gave GTM a chance to fire, so
 * Clarity recorded nothing or recorded only the "page hidden" event when the
 * tab was already closing. Clarity now has its own loader at
 * components/MicrosoftClarity.tsx (afterInteractive) — remove the Clarity tag
 * from the GTM container so we don't double-record.
 */
const GTM_ID = "GTM-MMNBQQWB";
const IDLE_DELAY_MS = 6000;

/**
 * Conversion landing pages have their own strict tracking path:
 *   - /success/:id owns the Meta Donate browser event + dedicated CAPI sender.
 *   - /donation-failed owns failure diagnostics/server-side failed events.
 *
 * Loading the full GTM container on these pages lets old broad triggers such as
 * All Pages / History Change / first_click re-fire Meta standard events
 * (PageView, AddPaymentInfo, CustomizeProduct, SubscribedButtonClick) on the
 * conversion page. That is exactly what polluted Pixel Helper and the ad
 * account. Keep GTM entirely off these pages; TrackingPixels and the dedicated
 * conversion endpoints are the source of truth there.
 */
const GTM_BLOCKED_PATH_RE = /\/(success|donation-failed)(\/|$)/;

function isGtmBlockedPath(): boolean {
  try {
    return GTM_BLOCKED_PATH_RE.test(window.location.pathname);
  } catch {
    return false;
  }
}

export default function DeferredGTM() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isGtmBlockedPath()) {
      (window as Window & { __gtmBlockedOnConversionPage?: boolean }).__gtmBlockedOnConversionPage = true;
      return;
    }

    if ((window as Window & { __gtmLoaded?: boolean }).__gtmLoaded) return;

    let fired = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadGtm = () => {
      if (fired) return;
      if (isGtmBlockedPath()) return;
      fired = true;
      (window as Window & { __gtmLoaded?: boolean }).__gtmLoaded = true;

      // Standard GTM bootstrap snippet, executed only when this fires.
      const dl = "dataLayer";
      const w = window as unknown as { [k: string]: unknown[] };
      w[dl] = w[dl] || [];
      (w[dl] as unknown[]).push({ "gtm.start": Date.now(), event: "gtm.js" });

      const f = document.getElementsByTagName("script")[0];
      const j = document.createElement("script");
      j.async = true;
      j.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      f?.parentNode?.insertBefore(j, f);

      cleanup();
    };

    const cleanup = () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      window.removeEventListener("scroll", loadGtm);
      window.removeEventListener("pointerdown", loadGtm);
      window.removeEventListener("keydown", loadGtm);
      window.removeEventListener("touchstart", loadGtm);
    };

    timeoutId = setTimeout(loadGtm, IDLE_DELAY_MS);
    window.addEventListener("scroll", loadGtm, { passive: true, once: true });
    window.addEventListener("pointerdown", loadGtm, { once: true });
    window.addEventListener("keydown", loadGtm, { once: true });
    window.addEventListener("touchstart", loadGtm, { passive: true, once: true });

    return cleanup;
  }, []);

  return null;
}
