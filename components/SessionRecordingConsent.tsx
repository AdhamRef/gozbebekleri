"use client";

import { useEffect, useState } from "react";

type Consent = "granted" | "denied" | null;
const KEY = "goz_analytics_consent";
function readConsent(): Consent {
  try {
    const value = localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch { return null; }
}
export default function SessionRecordingConsent() {
  const [consent, setConsent] = useState<Consent>("denied");
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const sync = () => setConsent(readConsent());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function choose(value: Exclude<Consent, null>) {
    const wasGranted = consent === "granted";
    try { localStorage.setItem(KEY, value); } catch { return; }
    setConsent(value);
    setEditing(false);
    window.dispatchEvent(new Event("goz:analytics-consent-change"));
    // Loaded third-party JS cannot reliably be unloaded. A fresh document
    // guarantees the newly denied state is evaluated before any tag can load.
    if (wasGranted && value === "denied") window.location.reload();
  }
  if (!ready) return null;
  return (
    <div className="fixed bottom-3 left-3 z-[9999] max-w-sm rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900 shadow-xl" role="region" aria-label="Session recording privacy preferences" dir="auto">
      {consent === null || editing ? (
        <>
          <p className="mb-3">نستخدم أدوات تحليل الزيارات وقياس الحملات وتسجيل الجلسات (Clarity وGoogle ووسوم الإعلانات) فقط بموافقتك. يمكنك الرفض أو سحب الموافقة في أي وقت. Analytics and session recording are optional.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded bg-slate-900 px-3 py-2 text-white" onClick={() => choose("granted")}>موافق / Accept</button>
            <button type="button" className="rounded border border-slate-400 px-3 py-2" onClick={() => choose("denied")}>رفض / Reject</button>
          </div>
        </>
      ) : (
        <button type="button" className="text-xs underline" onClick={() => setEditing(true)}>
          {consent === "granted" ? "سحب موافقة التحليلات والتسجيل / Withdraw consent" : "إعدادات خصوصية التحليلات / Privacy choices"}
        </button>
      )}
    </div>
  );
}
