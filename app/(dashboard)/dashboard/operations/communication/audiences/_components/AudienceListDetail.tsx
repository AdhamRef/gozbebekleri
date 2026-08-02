"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserPlus, FlaskConical, Trash2, Copy, Archive, Megaphone } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALES } from "@/lib/locales";

const API = "/api/dashboard/operations/communication/audience-lists";
const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm";

type Member = { id: string; contactType: "DONOR" | "TEST_CONTACT"; userId: string | null; name: string | null; email: string | null; phone: string | null; locale: string | null };
type ListSummary = { id: string; name: string; type: "CUSTOM" | "TEST"; status: string; channels: string[]; locale: string | null };
type Donor = { id: string; name: string | null; email: string | null; phone: string | null };

export function AudienceListDetail({ list, members }: { list: ListSummary; members: Member[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Donor[]>([]);
  const [tc, setTc] = React.useState({ name: "", email: "", phone: "", locale: "" });

  const memberIds = new Set(members.map((m) => m.userId).filter(Boolean));

  async function refresh() { router.refresh(); }

  async function search() {
    if (query.trim().length < 2) { setResults([]); return; }
    setBusy("search");
    try {
      const res = await fetch(`${API}/donor-search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setResults((j?.donors ?? []).filter((d: Donor) => !memberIds.has(d.id)));
    } finally { setBusy(null); }
  }

  async function post(path: string, init: RequestInit, tag: string) {
    setBusy(tag); setError(null);
    try {
      const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...init });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(j?.error || "تعذّر تنفيذ العملية"); return false; }
      return true;
    } finally { setBusy(null); }
  }

  const testHref = `/dashboard/operations/communication/settings`;
  const campaignHref = `/dashboard/operations/communication/campaigns?list=${list.id}`;

  return (
    <div className="space-y-5">
      {/* actions */}
      <div className="flex flex-wrap gap-2">
        <Link href={campaignHref} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-700"><Megaphone className="h-4 w-4" /> إنشاء حملة من القائمة</Link>
        {list.type === "TEST" ? <Link href={testHref} className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-800 hover:bg-amber-100"><FlaskConical className="h-4 w-4" /> أدوات الاختبار</Link> : null}
        <button type="button" disabled={busy !== null} onClick={async () => { const ok = await post(`/${list.id}/duplicate`, { method: "POST" }, "dup"); if (ok) refresh(); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><Copy className="h-4 w-4" /> نسخ القائمة</button>
        <button type="button" disabled={busy !== null} onClick={async () => { if (!confirm("أرشفة هذه القائمة؟")) return; const ok = await post(`/${list.id}`, { method: "PATCH", body: JSON.stringify({ status: "ARCHIVED" }) }, "arch"); if (ok) router.push("/dashboard/operations/communication/audiences"); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500 hover:bg-slate-50"><Archive className="h-4 w-4" /> أرشفة</button>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* members */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b p-3 text-sm font-black text-slate-800">الأعضاء ({members.length})</div>
          {members.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">لا يوجد أعضاء بعد. أضف متبرعين أو جهة اختبار.</p>
          ) : (
            <ul className="divide-y">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-800">{m.name ?? (m.contactType === "TEST_CONTACT" ? "جهة اختبار" : "متبرع")}</span>
                      {m.contactType === "TEST_CONTACT" ? <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">جهة اختبار</span> : <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">متبرع</span>}
                      {m.locale ? <span className="text-[10px] text-slate-400">{LOCALES[m.locale as keyof typeof LOCALES]?.label ?? m.locale}</span> : null}
                    </div>
                    <div className="truncate text-xs text-slate-400" dir="ltr">{m.email || m.phone || "—"}</div>
                  </div>
                  <button type="button" disabled={busy !== null} onClick={async () => { const ok = await post(`/${list.id}/members`, { method: "DELETE", body: JSON.stringify({ memberId: m.id }) }, `rm-${m.id}`); if (ok) refresh(); }} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">{busy === `rm-${m.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* add */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><UserPlus className="h-4 w-4 text-brand" /> إضافة متبرعين</p>
            <div className="flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="ابحث بالاسم أو البريد أو الهاتف" className={inputCls} />
              <button type="button" onClick={search} className="inline-flex h-10 items-center rounded-md bg-brand px-3 text-white">{busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
            </div>
            <div className="mt-2 space-y-1.5">
              {results.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <div className="min-w-0"><div className="truncate font-semibold text-slate-800">{d.name ?? "متبرع"}</div><div className="truncate text-slate-400" dir="ltr">{d.email || d.phone || "—"}</div></div>
                  <button type="button" onClick={async () => { const ok = await post(`/${list.id}/members`, { method: "POST", body: JSON.stringify({ userIds: [d.id] }) }, `add-${d.id}`); if (ok) { setResults((r) => r.filter((x) => x.id !== d.id)); refresh(); } }} className="shrink-0 rounded bg-brand/10 px-2 py-1 font-bold text-brand hover:bg-brand/20">إضافة</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><FlaskConical className="h-4 w-4 text-amber-600" /> جهة اختبار</p>
            <div className="grid gap-2">
              <input value={tc.name} onChange={(e) => setTc({ ...tc, name: e.target.value })} placeholder="الاسم (اختياري)" className={inputCls} />
              <input value={tc.email} onChange={(e) => setTc({ ...tc, email: e.target.value })} placeholder="البريد" className={inputCls} dir="ltr" />
              <input value={tc.phone} onChange={(e) => setTc({ ...tc, phone: e.target.value })} placeholder="الهاتف" className={inputCls} dir="ltr" />
              <select value={tc.locale} onChange={(e) => setTc({ ...tc, locale: e.target.value })} className={inputCls}>
                <option value="">اللغة (اختياري)</option>
                {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALES[l].label}</option>)}
              </select>
              <button type="button" onClick={async () => { if (!tc.email.trim() && !tc.phone.trim()) { setError("أدخل بريدًا أو رقمًا."); return; } const ok = await post(`/${list.id}/members`, { method: "POST", body: JSON.stringify({ testContact: tc }) }, "tc"); if (ok) { setTc({ name: "", email: "", phone: "", locale: "" }); refresh(); } }} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100">إضافة جهة اختبار</button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">جهات الاختبار لا تُحسب كمتبرعين ولا تظهر في تقارير التبرعات.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
