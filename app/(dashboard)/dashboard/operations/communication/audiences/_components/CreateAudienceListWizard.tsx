"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, Check, Search, UserPlus, FlaskConical, X } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALES } from "@/lib/locales";

const API = "/api/dashboard/operations/communication/audience-lists";
const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm";
const CHANNELS = [
  { key: "WHATSAPP", label: "واتساب" },
  { key: "EMAIL", label: "إيميل" },
  { key: "SMS", label: "رسائل قصيرة" },
];
const STEPS = ["الأساسيات", "إضافة الأعضاء", "المراجعة"];

type Donor = { id: string; name: string | null; email: string | null; phone: string | null; preferredLang: string | null };

export function CreateAudienceListWizard({ defaultType }: { defaultType: "CUSTOM" | "TEST" }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [listId, setListId] = React.useState<string | null>(null);
  const [addedCount, setAddedCount] = React.useState(0);

  // basics
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"CUSTOM" | "TEST">(defaultType);
  const [channels, setChannels] = React.useState<string[]>([]);
  const [locale, setLocale] = React.useState("");

  // members
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Donor[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [tc, setTc] = React.useState({ name: "", email: "", phone: "", locale: "" });

  function toggleChannel(c: string) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function createList() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, type, channels, locale: locale || null }) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.id) { setError(j?.error || "تعذّر إنشاء القائمة"); return false; }
      setListId(j.id);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/donor-search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setResults(j?.donors ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function addDonor(userId: string) {
    if (!listId) return;
    const res = await fetch(`${API}/${listId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: [userId] }) });
    const j = await res.json().catch(() => null);
    if (res.ok) { setAddedCount((c) => c + (j?.added ?? 0)); setResults((r) => r.filter((d) => d.id !== userId)); }
  }

  async function addTestContact() {
    if (!listId) return;
    if (!tc.email.trim() && !tc.phone.trim()) { setError("أدخل بريدًا أو رقمًا لجهة الاختبار."); return; }
    setError(null);
    const res = await fetch(`${API}/${listId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testContact: tc }) });
    const j = await res.json().catch(() => null);
    if (!res.ok) { setError(j?.error || "تعذّر إضافة جهة الاختبار"); return; }
    setAddedCount((c) => c + 1);
    setTc({ name: "", email: "", phone: "", locale: "" });
  }

  async function next() {
    if (step === 0) {
      if (!name.trim()) { setError("اسم القائمة مطلوب."); return; }
      const ok = await createList();
      if (!ok) return;
      setStep(1);
    } else {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${i === step ? "border-[#025EB8] bg-[#025EB8] text-white" : i < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">اسم القائمة</span><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">الوصف</span><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></label>
            <div><span className="mb-1 block text-xs font-bold text-slate-600">النوع</span>
              <div className="flex gap-2">
                {(["CUSTOM", "TEST"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold ${type === t ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}>{t === "CUSTOM" ? "مخصصة" : "اختبار"}</button>
                ))}
              </div>
            </div>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">اللغة (اختياري)</span>
              <select value={locale} onChange={(e) => setLocale(e.target.value)} className={inputCls}>
                <option value="">كل اللغات</option>
                {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALES[l].label}</option>)}
              </select>
            </label>
            <div className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">القنوات</span>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button key={c.key} type="button" onClick={() => toggleChannel(c.key)} className={`rounded-md border px-3 py-1.5 text-xs font-bold ${channels.includes(c.key) ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}>{c.label}</button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Search donors */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><UserPlus className="h-4 w-4 text-[#025EB8]" /> إضافة متبرعين</p>
              <div className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="ابحث بالاسم أو البريد أو الهاتف" className={inputCls} />
                <button type="button" onClick={search} className="inline-flex h-10 items-center gap-1 rounded-md bg-[#025EB8] px-3 text-xs font-bold text-white">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
              </div>
              <div className="mt-2 space-y-1.5">
                {results.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">ابحث لإضافة متبرعين حقيقيين.</p> : results.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                    <div className="min-w-0"><div className="truncate font-semibold text-slate-800">{d.name ?? "متبرع"}</div><div className="truncate text-slate-400">{d.email || d.phone || "—"}</div></div>
                    <button type="button" onClick={() => addDonor(d.id)} className="shrink-0 rounded bg-[#025EB8]/10 px-2 py-1 font-bold text-[#025EB8] hover:bg-[#025EB8]/20">إضافة</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test contact */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><FlaskConical className="h-4 w-4 text-amber-600" /> جهة اختبار (لا تُحسب كمتبرع)</p>
              <div className="grid gap-2">
                <input value={tc.name} onChange={(e) => setTc({ ...tc, name: e.target.value })} placeholder="الاسم (اختياري)" className={inputCls} />
                <input value={tc.email} onChange={(e) => setTc({ ...tc, email: e.target.value })} placeholder="البريد" className={inputCls} dir="ltr" />
                <input value={tc.phone} onChange={(e) => setTc({ ...tc, phone: e.target.value })} placeholder="الهاتف" className={inputCls} dir="ltr" />
                <select value={tc.locale} onChange={(e) => setTc({ ...tc, locale: e.target.value })} className={inputCls}>
                  <option value="">اللغة (اختياري)</option>
                  {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALES[l].label}</option>)}
                </select>
                <button type="button" onClick={addTestContact} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100">إضافة جهة اختبار</button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">جهات الاختبار تُستخدم فقط لتجربة الحملات والقوالب، ولا تظهر في تقارير التبرعات ولا في الحملات الحقيقية.</p>
            </div>
            <p className="lg:col-span-2 text-sm font-bold text-slate-700">تمت الإضافة: {addedCount}</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-slate-50 p-4 text-sm">
              <p className="font-black text-slate-900">{name}</p>
              <p className="mt-1 text-slate-600">النوع: {type === "TEST" ? "اختبار" : "مخصصة"} · القنوات: {channels.length ? channels.map((c) => CHANNELS.find((x) => x.key === c)?.label).join("، ") : "—"} · اللغة: {locale ? LOCALES[locale as keyof typeof LOCALES]?.label : "كل اللغات"}</p>
              <p className="mt-2 text-slate-700">عدد الأعضاء المضافين: <b>{addedCount}</b></p>
            </div>
            <button type="button" onClick={() => { if (listId) { router.push(`/dashboard/operations/communication/audiences/${listId}`); router.refresh(); } }} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white hover:bg-[#024a92]"><Check className="h-4 w-4" /> حفظ وفتح القائمة</button>
          </div>
        ) : null}

        {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 disabled:opacity-40"><ArrowRight className="h-4 w-4" /> السابق</button>
        {step < STEPS.length - 1 ? (
          <button type="button" disabled={busy} onClick={next} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} التالي <ArrowLeft className="h-4 w-4" /></button>
        ) : null}
      </div>
    </div>
  );
}
