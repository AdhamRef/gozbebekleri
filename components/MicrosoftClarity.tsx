"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Clarity from "@microsoft/clarity";
import { mayInitializeClarity } from "@/lib/tracking/clarity-privacy-policy";
import { validateClarityProjectId } from "@/lib/tracking/provider-runtime-policy";

declare global {
  interface Window {
    __clarityInitialized?: boolean;
    __clarityProjectId?: string;
    __clarityStopped?: boolean;
    clarity?: (...args: unknown[]) => void;
  }
}

function consentValue(): string | null {
  try { return window.localStorage.getItem("goz_analytics_consent"); }
  catch { return null; }
}
function publicAndConsented(): boolean {
  return mayInitializeClarity(window.location.pathname, consentValue(), window.location.search);
}
function hasForeignClarityScript(): boolean {
  return Array.from(document.scripts).some(script => {
    try {
      const url = new URL(script.src);
      return url.hostname === "www.clarity.ms" || url.hostname === "clarity.ms";
    } catch { return false; }
  });
}

/** The history events are necessary for same-path query changes via pushState. */
function listenForHistoryChanges(refresh: () => void): () => void {
  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  window.history.pushState = function (...args) {
    const result = originalPush.apply(this, args);
    refresh();
    return result;
  };
  window.history.replaceState = function (...args) {
    const result = originalReplace.apply(this, args);
    refresh();
    return result;
  };
  return () => {
    window.history.pushState = originalPush;
    window.history.replaceState = originalReplace;
  };
}

export default function MicrosoftClarity() {
  const pathname = usePathname();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const disposeHistory = listenForHistoryChanges(refresh);
    for (const name of ["storage", "focus", "popstate", "hashchange", "goz:analytics-consent-change"]) {
      window.addEventListener(name, refresh);
    }
    return () => {
      disposeHistory();
      for (const name of ["storage", "focus", "popstate", "hashchange", "goz:analytics-consent-change"]) {
        window.removeEventListener(name, refresh);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!publicAndConsented()) {
      if (window.__clarityInitialized && !window.__clarityStopped) {
        try {
          window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
          window.clarity?.("stop");
        } catch { /* provider network shutdown still requires staging evidence */ }
        window.__clarityStopped = true;
      }
      return;
    }
    // Recheck server-side enablement on every eligibility transition. Never
    // resume a recorder based on stale settings from a previous route.
    void fetch("/api/tracking/config", {
      cache: "no-store", credentials: "same-origin", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const settings = await response.json();
      const id = validateClarityProjectId(settings?.clarityProjectId);
      if (controller.signal.aborted || !publicAndConsented() ||
          !settings?.clarityEnabled || !id) {
        if (window.__clarityInitialized && !window.__clarityStopped) {
          try {
            window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
            window.clarity?.("stop");
          } catch {}
          window.__clarityStopped = true;
        }
        return;
      }
      if (window.__clarityInitialized) {
        // A changed project ID must never silently reinitialize a live recorder.
        if (window.__clarityProjectId !== id) return;
        if (window.__clarityStopped && publicAndConsented()) {
          try {
            if (typeof window.clarity !== "function") return;
            window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
            window.clarity("start");
            window.__clarityStopped = false;
          } catch { /* do not mark a failed start successful */ }
        }
        return;
      }
      if (hasForeignClarityScript()) {
        // Do not claim ownership of an externally injected recorder.
        return;
      }
      if (!publicAndConsented() || controller.signal.aborted) return;
      Clarity.init(id);
      window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
      window.__clarityInitialized = true;
      window.__clarityStopped = false;
      window.__clarityProjectId = id;
    }).catch(() => { /* fail closed: tracking never breaks the application */ });
    return () => controller.abort();
  }, [pathname, revision]);
  return null;
}
