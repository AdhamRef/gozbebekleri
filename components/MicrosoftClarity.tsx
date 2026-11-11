"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSensitiveClarityPath, mayInitializeClarity } from "@/lib/tracking/clarity-privacy-policy";
import Clarity from "@microsoft/clarity";
import { validateClarityProjectId } from "@/lib/tracking/provider-runtime-policy";

declare global {
  interface Window {
    __clarityInitialized?: boolean;
    __clarityProjectId?: string;
  }
}

/** Fetch the public, redacted runtime settings on every fresh page load.
 * The dashboard must not record its own administrators. Do not call init if
 * any Clarity script already exists (including a legacy GTM-injected tag).
 */
export default function MicrosoftClarity() {
  const pathname = usePathname();
  useEffect(() => {
    // If the page becomes sensitive after an SPA navigation, ask the hosted
    // provider to stop. Until its network behavior is verified on staging,
    // recording is NOT certified as safe on navigation.
    if (isSensitiveClarityPath(pathname)) {
      if (window.__clarityInitialized) {
        try {
          (window as Window & { clarity?: (...args: unknown[]) => void }).clarity?.("stop");
        } catch {}
      }
      return;
    }
    if (window.__clarityInitialized) return;
    let consent: string | null = null;
    try { consent = window.localStorage.getItem("goz_analytics_consent"); } catch {}
    if (!mayInitializeClarity(pathname, consent)) return;
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
      window.__clarityProjectId = id;
    }).catch(() => {
      // Tracking must not break navigation or expose provider details.
    });
    return () => controller.abort();
  }, [pathname]);
  return null;
}
