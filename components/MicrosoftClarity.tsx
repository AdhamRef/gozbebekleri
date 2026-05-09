import Script from "next/script";

/**
 * Loads Microsoft Clarity directly (NOT through GTM) so it starts capturing as
 * soon as the page is interactive — independent of when GTM fires.
 *
 * Why this matters
 * ----------------
 * Previously Clarity was injected by our GTM container, and GTM is deferred 6 s
 * or until first user interaction (DeferredGTM.tsx). Paid Meta/Facebook traffic
 * that bounces in 2–4 s never gave GTM a chance to fire, so Clarity recordings
 * either didn't exist or started literally at the moment the tab was closing —
 * exactly what produced the "page hidden at 00:01" pattern across many sessions.
 *
 * Behaviour
 * ---------
 * - Loaded with `next/script` strategy="afterInteractive" — runs after hydration,
 *   does not block FCP/LCP.
 * - No-op if NEXT_PUBLIC_CLARITY_ID is absent (e.g. local dev without the var).
 * - Production-only by default. To verify in dev set NEXT_PUBLIC_CLARITY_DEBUG=1.
 * - Survives client-side route changes — Next renders this once at the root
 *   layout level and never re-runs the script tag.
 *
 * IMPORTANT operational note
 * --------------------------
 * The GTM container very likely still has a Clarity tag inside it. Remove that
 * tag from GTM (or pause it) so we don't double-record. Each page now loads
 * Clarity exactly once via this component.
 */
export default function MicrosoftClarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();
  const isProd = process.env.NODE_ENV === "production";
  const debug = process.env.NEXT_PUBLIC_CLARITY_DEBUG === "1";
  if (!id) return null;
  if (!isProd && !debug) return null;

  // Standard Clarity bootstrap. This stub creates `window.clarity` immediately
  // so analytics calls made before the remote script lands get queued.
  const inline = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${id.replace(/"/g, '\\"')}");
  `;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: inline }}
    />
  );
}
