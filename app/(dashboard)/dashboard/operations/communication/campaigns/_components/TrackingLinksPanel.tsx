"use client";

import * as React from "react";
import { Link2, Loader2, Plus, ExternalLink, Check, TriangleAlert } from "lucide-react";

const API = "/api/dashboard/operations/communication/campaigns";

type Link = { id: string; url: string; source: string; locale: string | null };
type Report = {
  hasTrackingLink: boolean;
  confidence: "دقيق" | "جزئي" | "غير متاح";
  successful: { count: number; valueUSD: number };
  failed: { count: number; valueUSD: number } | null;
  averageUSD: number | null;
  bestLanguage: { locale: string; label: string; valueUSD: number } | null;
  visits: null;
  links: Link[];
} | null;

const CONF_CLS: Record<string, string> = { "دقيق": "border-emerald-200 bg-emerald-50 text-emerald-700", "جزئي": "border-amber-200 bg-amber-50 text-amber-700", "غير متاح": "border-slate-200 bg-slate-50 text-slate-500" };
const money = (n: number) => `${n.toLocaleString("ar")}$`;

export function TrackingLinksPanel({ campaignId, report, onChanged }: { campaignId: string; report: Report; onChanged: () => void }) {
  const [mode, setMode] = React.useState<"none" | "existing" | "create">("none");
  const [existingUrl, setExistingUrl] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [noLinkConfirmed, setNoLinkConfirmed] = React.useState(false);

  const links = report?.links ?? [];

  async function attach(body: Record<string, unknown>) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/${campaignId}/tracking-links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error || "تعذّر ربط الرابط"); return; }
      setExistingUrl(""); setBaseUrl(""); setMode("none");
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><Link2 className="h-4 w-4 text-brand" /> روابط التتبع</h3>
        {report ? <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${CONF_CLS[report.confidence]}`}>الدقّة: {report.confidence}</span> : null}
      </div>

      {/* Existing links + real donation attribution */}
      {links.length > 0 ? (
        <div className="mt-3 space-y-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <a href={l.url} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 flex-1 truncate font-mono text-slate-600 hover:text-brand">{l.url}</a>
              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-bold text-slate-500">{l.source}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </div>
          ))}
          {report ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="تبرعات ناجحة" value={String(report.successful.count)} />
              <Stat label="قيمة التبرعات" value={money(report.successful.valueUSD)} tone="text-emerald-700" />
              <Stat label="متوسط التبرع" value={report.averageUSD !== null ? money(report.averageUSD) : "غير متاح"} />
              <Stat label="محاولات فاشلة" value={report.failed ? `${report.failed.count}` : "غير متاح"} tone={report.failed ? "text-rose-700" : "text-slate-400"} />
            </div>
          ) : null}
          {report?.bestLanguage ? <p className="text-[11px] text-slate-500">أفضل لغة بالقيمة: <b>{report.bestLanguage.label}</b> ({money(report.bestLanguage.valueUSD)})</p> : null}
          <p className="text-[11px] text-slate-400">الزيارات غير مُسجّلة بعد — غير متاحة. القيم بالدولار من بيانات التبرعات الفعلية.</p>
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
          <TriangleAlert className="mb-0.5 me-1 inline h-3.5 w-3.5" /> لا توجد روابط تتبع مرتبطة بهذه الحملة، لذلك لا يمكن حساب التبرعات المنسوبة لها بدقة.
        </div>
      )}

      {/* Add options */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode(mode === "existing" ? "none" : "existing")} className={`rounded-md border px-3 py-1.5 text-xs font-bold ${mode === "existing" ? "border-brand bg-brand/5 text-brand" : "border-slate-200 text-slate-600"}`}>اختر رابطًا موجودًا</button>
        <button type="button" onClick={() => setMode(mode === "create" ? "none" : "create")} className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold ${mode === "create" ? "border-brand bg-brand/5 text-brand" : "border-slate-200 text-slate-600"}`}><Plus className="h-3 w-3" /> إنشاء رابط تتبع</button>
      </div>

      {mode === "existing" ? (
        <div className="mt-2 flex gap-2">
          <input value={existingUrl} onChange={(e) => setExistingUrl(e.target.value)} placeholder="ألصق رابط تتبع من مولد الروابط" dir="ltr" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" disabled={busy || !existingUrl.trim()} onClick={() => attach({ existingUrl: existingUrl.trim() })} className="inline-flex h-10 shrink-0 items-center rounded-md bg-brand px-3 text-xs font-bold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ربط"}</button>
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="رابط صفحة التبرع (مثل صفحة الحملة)" dir="ltr" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            <button type="button" disabled={busy || !baseUrl.trim()} onClick={() => attach({ baseUrl: baseUrl.trim(), createInGenerator: true })} className="inline-flex h-10 shrink-0 items-center rounded-md bg-brand px-3 text-xs font-bold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}</button>
          </div>
          <p className="text-[11px] text-slate-400">سيُضاف تلقائيًا: المصدر حسب القناة، الوسيط communication، والحملة مربوطة بهذه الحملة. لا تُنشأ روابط وهمية.</p>
        </div>
      ) : null}

      {/* No-link explicit confirmation */}
      {links.length === 0 ? (
        <label className="mt-3 flex items-start gap-2 text-[11px] font-semibold text-slate-600">
          <input type="checkbox" checked={noLinkConfirmed} onChange={(e) => setNoLinkConfirmed(e.target.checked)} className="mt-0.5" />
          هذه الحملة لا تحتوي على رابط تبرع — أُقرّ بأنه لن يتم حساب التبرعات المنسوبة لهذه الحملة بدقة.
        </label>
      ) : null}
      {links.length === 0 && noLinkConfirmed ? <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700"><Check className="h-3 w-3" /> تم الإقرار.</p> : null}

      {error ? <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm font-black ${tone ?? "text-slate-800"}`}>{value}</div>
    </div>
  );
}
