"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, Check, Search, UserPlus, FlaskConical, X, AlertTriangle } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALES } from "@/lib/locales";

const API = "/api/dashboard/operations/communication/audience-lists";
const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm";
const CHANNELS = [
  { key: "WHATSAPP", label: "واتساب" },
  { key: "EMAIL", label: "إيميل" },
  { key: "SMS", label: "رسائل قصيرة" },
];
const STEPS = ["الأساسيات", "إضافة الأعضاء", "المراجعة والحفظ"];
const TYPE_LABEL: Record<"CUSTOM" | "TEST", string> = { CUSTOM: "قائمة مخصصة", TEST: "قائمة اختبار" };

type Donor = { id: string; name: string | null; email: string | null; phone: string | null; preferredLang: string | null; lastDonationAt?: string | null };

/** A person the user has chosen, held in client state until the final save. */
type Selected = {
  key: string;
  kind: "DONOR" | "TEST";
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  locale: string | null;
};

function localeLabel(locale: string | null | undefined): string | null {
  if (!locale) return null;
  return LOCALES[locale as keyof typeof LOCALES]?.label ?? locale;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ar");
}

/** Normalized key for a test contact so the same email/phone can't be added twice. */
function testKey(email: string, phone: string): string {
  return `t:${email.trim().toLowerCase()}|${phone.trim()}`;
}

export function CreateAudienceListWizard({ defaultType, smsEnabled = true }: { defaultType: "CUSTOM" | "TEST"; smsEnabled?: boolean }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warn, setWarn] = React.useState<string | null>(null);
  const [listId, setListId] = React.useState<string | null>(null);
  const savedTestKeys = React.useRef<Set<string>>(new Set());

  // Step 1 — basics
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"CUSTOM" | "TEST">(defaultType);
  const [channels, setChannels] = React.useState<string[]>([]);
  const [locale, setLocale] = React.useState("");

  // Step 2 — members (selection lives here and survives step changes)
  const [selected, setSelected] = React.useState<Selected[]>([]);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Donor[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [tc, setTc] = React.useState({ name: "", email: "", phone: "", locale: "" });

  const donorsCount = selected.filter((s) => s.kind === "DONOR").length;
  const testsCount = selected.filter((s) => s.kind === "TEST").length;
  const selectedDonorIds = React.useMemo(() => new Set(selected.filter((s) => s.kind === "DONOR").map((s) => s.userId)), [selected]);

  function toggleChannel(c: string) {
    if (c === "SMS" && !smsEnabled) return;
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
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

  function addDonor(d: Donor) {
    setWarn(null);
    if (selectedDonorIds.has(d.id)) { setWarn("هذا المتبرع مضاف بالفعل."); return; }
    setSelected((prev) => [...prev, { key: `d:${d.id}`, kind: "DONOR", userId: d.id, name: d.name, email: d.email, phone: d.phone, locale: d.preferredLang }]);
  }

  function addTestContact() {
    setWarn(null);
    const email = tc.email.trim();
    const phone = tc.phone.trim();
    if (!email && !phone) { setWarn("أدخل بريدًا أو رقمًا لجهة الاختبار."); return; }
    const key = testKey(email, phone);
    if (selected.some((s) => s.kind === "TEST" && s.key === key)) { setWarn("جهة الاختبار مضافة بالفعل."); return; }
    setSelected((prev) => [...prev, { key, kind: "TEST", userId: null, name: tc.name.trim() || null, email: email || null, phone: phone || null, locale: tc.locale || null }]);
    setTc({ name: "", email: "", phone: "", locale: "" });
  }

  function removeSelected(key: string) {
    setSelected((prev) => prev.filter((s) => s.key !== key));
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (!name.trim()) { setError("اسم القائمة مطلوب."); return; }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  /** Persist everything at the end: create the list, then add donors + test contacts, then open it. */
  async function save() {
    if (!name.trim()) { setStep(0); setError("اسم القائمة مطلوب."); return; }
    setBusy(true);
    setError(null);
    try {
      let id = listId;
      if (!id) {
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, type, channels, locale: locale || null }) });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.id) { setError(j?.error || "تعذّر إنشاء القائمة"); return; }
        id = j.id as string;
        setListId(id);
      }

      const donorIds = selected.filter((s) => s.kind === "DONOR").map((s) => s.userId!).filter(Boolean);
      if (donorIds.length) {
        const res = await fetch(`${API}/${id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: donorIds }) });
        if (!res.ok) { const e = await res.json().catch(() => null); setError(e?.error || "تعذّر إضافة المتبرعين."); return; }
      }

      for (const t of selected.filter((s) => s.kind === "TEST")) {
        if (savedTestKeys.current.has(t.key)) continue; // avoid double-adding on retry after a partial failure
        const res = await fetch(`${API}/${id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testContact: { name: t.name, email: t.email, phone: t.phone, locale: t.locale } }) });
        if (!res.ok) { const e = await res.json().catch(() => null); setError(e?.error || "تعذّر إضافة جهة الاختبار."); return; }
        savedTestKeys.current.add(t.key);
      }

      router.push(`/dashboard/operations/communication/audiences/${id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const SelectedList = ({ withRemove = true }: { withRemove?: boolean }) => (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <span className="text-sm font-black text-slate-800">الأعضاء المحددون</span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">تم تحديد {selected.length} أعضاء</span>
      </div>
      {selected.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">لم يتم تحديد أي شخص بعد.</p>
      ) : (
        <ul className="divide-y">
          {selected.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-slate-800">{s.name ?? (s.kind === "TEST" ? "جهة اختبار" : "متبرع")}</span>
                  {s.kind === "TEST" ? (
                    <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">جهة اختبار</span>
                  ) : (
                    <span className="rounded border border-[#025EB8]/20 bg-[#025EB8]/5 px-1.5 py-0.5 text-[10px] font-bold text-[#025EB8]">متبرع</span>
                  )}
                  {localeLabel(s.locale) ? <span className="text-[10px] text-slate-400">{localeLabel(s.locale)}</span> : null}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400" dir="ltr">
                  {s.email ? <span className="truncate">{s.email}</span> : null}
                  {s.phone ? <span className="truncate">{s.phone}</span> : null}
                  {!s.email && !s.phone ? <span>—</span> : null}
                </div>
              </div>
              {withRemove ? (
                <button type="button" onClick={() => removeSelected(s.key)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" /> إزالة
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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
        {/* Step 1 — basics */}
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">اسم القائمة</span><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">الوصف</span><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></label>
            <div><span className="mb-1 block text-xs font-bold text-slate-600">النوع</span>
              <div className="flex gap-2">
                {(["CUSTOM", "TEST"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold ${type === t ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}>{TYPE_LABEL[t]}</button>
                ))}
              </div>
              {type === "TEST" ? <p className="mt-1.5 text-[11px] leading-5 text-amber-700">جهة اختبار فقط، لن تظهر ضمن المتبرعين.</p> : null}
            </div>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">اللغة (اختياري)</span>
              <select value={locale} onChange={(e) => setLocale(e.target.value)} className={inputCls}>
                <option value="">كل اللغات</option>
                {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALES[l].label}</option>)}
              </select>
            </label>
            <div className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">القنوات</span>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => {
                  const disabled = c.key === "SMS" && !smsEnabled;
                  const active = channels.includes(c.key);
                  return (
                    <button key={c.key} type="button" disabled={disabled} onClick={() => toggleChannel(c.key)} className={`rounded-md border px-3 py-1.5 text-xs font-bold ${disabled ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" : active ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}>{c.label}</button>
                  );
                })}
              </div>
              {!smsEnabled ? <p className="mt-1.5 text-[11px] leading-5 text-slate-400">الرسائل القصيرة غير مفعّلة حاليًا</p> : null}
            </div>
          </div>
        ) : null}

        {/* Step 2 — add members */}
        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Area A — search real donors */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><UserPlus className="h-4 w-4 text-[#025EB8]" /> إضافة متبرعين</p>
                <div className="flex gap-2">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="ابحث بالاسم أو البريد أو الهاتف" className={inputCls} />
                  <button type="button" onClick={search} className="inline-flex h-10 items-center gap-1 rounded-md bg-[#025EB8] px-3 text-xs font-bold text-white">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {results.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">ابحث لإضافة متبرعين حقيقيين.</p> : results.map((d) => {
                    const added = selectedDonorIds.has(d.id);
                    const last = fmtDate(d.lastDonationAt);
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800">{d.name ?? "متبرع"}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-slate-400" dir="ltr">
                            {d.email ? <span className="truncate">{d.email}</span> : null}
                            {d.phone ? <span className="truncate">{d.phone}</span> : null}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-slate-400">
                            {localeLabel(d.preferredLang) ? <span>{localeLabel(d.preferredLang)}</span> : null}
                            {last ? <span>آخر تبرع: {last}</span> : null}
                          </div>
                        </div>
                        {added ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 font-bold text-emerald-600"><Check className="h-3.5 w-3.5" /> مضاف</span>
                        ) : (
                          <button type="button" onClick={() => addDonor(d)} className="shrink-0 rounded bg-[#025EB8]/10 px-2 py-1 font-bold text-[#025EB8] hover:bg-[#025EB8]/20">إضافة</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Area B — add test contact */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><FlaskConical className="h-4 w-4 text-amber-600" /> إضافة جهة اختبار</p>
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
                <p className="mt-2 text-[11px] leading-5 text-slate-400">جهة اختبار فقط، لن تظهر ضمن المتبرعين.</p>
              </div>
            </div>

            {warn ? <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> {warn}</p> : null}

            <SelectedList />
          </div>
        ) : null}

        {/* Step 3 — review & save */}
        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">اسم القائمة:</span> <b className="text-slate-900">{name || "—"}</b></div>
              <div><span className="text-slate-500">النوع:</span> <b className="text-slate-900">{TYPE_LABEL[type]}</b></div>
              <div><span className="text-slate-500">اللغة:</span> <b className="text-slate-900">{locale ? LOCALES[locale as keyof typeof LOCALES]?.label : "كل اللغات"}</b></div>
              <div><span className="text-slate-500">القنوات:</span> <b className="text-slate-900">{channels.length ? channels.map((c) => CHANNELS.find((x) => x.key === c)?.label).join("، ") : "—"}</b></div>
              <div><span className="text-slate-500">إجمالي الأعضاء:</span> <b className="text-slate-900">{selected.length}</b></div>
              <div><span className="text-slate-500">المتبرعون:</span> <b className="text-slate-900">{donorsCount}</b> · <span className="text-slate-500">جهات الاختبار:</span> <b className="text-slate-900">{testsCount}</b></div>
            </div>

            <SelectedList />

            <button type="button" onClick={save} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white hover:bg-[#024a92] disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} حفظ القائمة</button>
          </div>
        ) : null}

        {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" disabled={step === 0} onClick={() => { setError(null); setStep((s) => Math.max(0, s - 1)); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 disabled:opacity-40"><ArrowRight className="h-4 w-4" /> السابق</button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white">التالي <ArrowLeft className="h-4 w-4" /></button>
        ) : null}
      </div>
    </div>
  );
}
