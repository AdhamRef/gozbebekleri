"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Archive, Loader2, FolderOpen } from "lucide-react";

const API = "/api/dashboard/operations/communication/audience-lists";
const BASE = "/dashboard/operations/communication/audiences";

/** Row actions for a custom/test audience list: open, duplicate, archive. */
export function AudienceListRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function call(url: string, init: RequestInit, tag: string) {
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error || "تعذّر تنفيذ العملية"); return; }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Link href={`${BASE}/${id}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-brand hover:bg-slate-50"><FolderOpen className="h-3 w-3" /> فتح</Link>
        <button type="button" disabled={busy !== null} onClick={() => call(`${API}/${id}/duplicate`, { method: "POST" }, "dup")} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{busy === "dup" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />} نسخ</button>
        <button type="button" disabled={busy !== null} onClick={() => { if (confirm("أرشفة هذه القائمة؟")) call(`${API}/${id}`, { method: "PATCH", body: JSON.stringify({ status: "ARCHIVED" }) }, "arch"); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60">{busy === "arch" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />} أرشفة</button>
      </div>
      {error ? <span className="text-[10px] font-semibold text-rose-600">{error}</span> : null}
    </div>
  );
}
