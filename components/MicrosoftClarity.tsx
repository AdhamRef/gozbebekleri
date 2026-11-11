"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isSensitiveClarityPath, mayInitializeClarity } from "@/lib/tracking/clarity-privacy-policy";
import Clarity from "@microsoft/clarity";
import { validateClarityProjectId } from "@/lib/tracking/provider-runtime-policy";

declare global {
  interface Window {
    __clarityInitialized?: boolean;
    __clarityProjectId?: string;
    __clarityStopped?: boolean;
  }
}

/** Fetch the public, redacted runtime settings on every fresh page load.
 * The dashboard must not record its own administrators. Do not call init if
 * any Clarity script already exists (including a legacy GTM-injected tag).
 */
export default function MicrosoftClarity() {
  const pathname = usePathname();
  const [consentRevision, setConsentRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setConsentRevision(value => value + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("goz:analytics-consent-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("goz:analytics-consent-change", refresh);
    };
  }, []);
  useEffect(() => {
    // Conservative privacy gate: no Clarity init/start on sensitive pages
    // or without an explicit consent signal from the approved CMP.
    let consent: string | null = null;
    try { consent = window.localStorage.getItem("goz_analytics_consent"); } catch {}
    if (!mayInitializeClarity(pathname, consent)) {
      if (window.__clarityInitialized && !window.__clarityStopped) {
        try {
          (window as Window & { clarity?: (...args: unknown[]) => void }).clarity?.("stop");
        } catch {}
        window.__clarityStopped = true;
      }
      return;
    }
    if (window.__clarityInitialized) {
      if (window.__clarityStopped) {
        // Restart ONLY on a consented public page. Provider network validation
        // is still required to prove stopping actually ceased uploads.
        try {
          (window as Window & { clarity?: (...args: unknown[]) => void }).clarity?.("start");
          window.__clarityStopped = false;
        } catch {}
      }
      return;
    }
    const controller = new AbortController();
    void fetch("/api/tracking/config", {
      cache: "no-store", credentials: "same-origin", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const settings = await response.json();
      const id = validateClarityProjectId(settings?.clarityProjectId);
      if (!settings?.clarityEnabled || !id ||
          controller.signal.aborted || window.__clarityInitialized) return;
      if (Array.from(document.scripts).some(script =>
        /(^|\.)clarity\.ms$/.test((() => { try { return new URL(script.src).hostname; } catch { return ""; } })()))) {
        window.__clarityInitialized = true;
        return;
      }
      Clarity.init(id);
      window.__clarityInitialized = true;
      window.__clarityStopped = false;
      window.__clarityProjectId = id;
    }).catch(() => {
      // Tracking must not break navigation or expose provider details.
    });
    return () => controller.abort();
  }, [pathname, consentRevision]);
  return null;
}
