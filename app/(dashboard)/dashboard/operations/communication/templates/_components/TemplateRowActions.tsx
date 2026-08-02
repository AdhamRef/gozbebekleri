"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Languages, Loader2, Archive } from "lucide-react";

const API = "/api/dashboard/operations/communication/templates";

/** Row actions for a template group: duplicate group, add a language variant, archive. */
export function TemplateRowActions({
  id,
  missingLocales,
  isSystem,
}: {
  id: string;
  missingLocales: { code: string; label: string }[];
  isSystem: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [addingLang, setAddingLang] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function call(url: string, init: RequestInit, tag: string) {
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setError(json?.error || "تعذّر تنفيذ العملية"); return false; }
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => call(`${API}/${id}/duplicate`, { method: "POST" }, "dup")}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busy === "dup" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />} نسخ
        </button>
        {missingLocales.length > 0 ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setAddingLang((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Languages className="h-3 w-3" /> إضافة لغة
          </button>
        ) : null}
        {!isSystem ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call(`${API}/${id}`, { method: "PATCH", body: JSON.stringify({ status: "ARCHIVED" }) }, "arch")}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === "arch" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />} أرشفة
          </button>
        ) : null}
      </div>
      {addingLang ? (
        <div className="flex flex-wrap justify-end gap-1">
          {missingLocales.map((l) => (
            <button
              key={l.code}
              type="button"
              disabled={busy !== null}
              onClick={() => call(`${API}/${id}/variants`, { method: "POST", body: JSON.stringify({ language: l.code }) }, `lang-${l.code}`).then((ok) => ok && setAddingLang(false))}
              className="inline-flex h-6 items-center rounded border border-brand/30 bg-brand/5 px-2 text-[11px] font-bold text-brand hover:bg-brand/10 disabled:opacity-60"
            >
              {busy === `lang-${l.code}` ? <Loader2 className="h-3 w-3 animate-spin" /> : l.label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <span className="text-[10px] font-semibold text-rose-600">{error}</span> : null}
    </div>
  );
}
