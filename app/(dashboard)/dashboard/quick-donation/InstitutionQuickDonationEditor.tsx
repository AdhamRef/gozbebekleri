"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SUPPORTED_CURRENCY_OPTIONS } from "@/lib/supported-currencies";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import {
  EMPTY_INSTITUTION_QUICK_DONATION,
  type InstitutionQuickDonation,
  type QuickCadence,
  type QuickDestination,
  validateInstitutionQuickDonation,
} from "@/lib/quick-donation/institution-config";

type CampaignOption = { id: string; title: string; isActive: boolean };
const FREQ: { code: QuickCadence; label: string }[] = [
  { code: "once", label: "مرة واحدة" },
  { code: "daily", label: "يومي" },
  { code: "friday", label: "كل جمعة" },
  { code: "monthly", label: "شهري" },
];
const fields = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600";
const section = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4";

export function InstitutionQuickDonationEditor() {
  const [form, setForm] = useState<InstitutionQuickDonation>(EMPTY_INSTITUTION_QUICK_DONATION);
  const [amountText, setAmountText] = useState("10, 25, 50, 100");
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [settings, projects] = await Promise.all([
        fetch("/api/quick-donation", { cache: "no-store" }),
        fetch("/api/campaigns?limit=100&page=1", { cache: "no-store" }),
      ]);
      if (!settings.ok || !projects.ok) throw new Error("تعذر جلب الإعدادات أو المشاريع");
      const data: { config: InstitutionQuickDonation } = await settings.json();
      const response: { items?: CampaignOption[]; hasMore?: boolean } = await projects.json();
      const config = validateInstitutionQuickDonation(data.config);
      const all = [...(response.items ?? [])];
      for (let page = 2; response.hasMore && page <= 5; page++) {
        const r = await fetch("/api/campaigns?limit=100&page=" + page, { cache: "no-store" });
        if (!r.ok) throw new Error("تعذر تحميل بقية المشاريع");
        const p: { items?: CampaignOption[]; hasMore?: boolean } = await r.json();
        all.push(...(p.items ?? [])); response.hasMore = p.hasMore;
      }
      setCampaigns(all.filter(p => p.isActive));
      setForm(config);
      setAmountText(config.amounts.join(", "));
      setLoadedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحميل");
      setLoadedAt(null);
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function update(patch: Partial<InstitutionQuickDonation>) {
    setForm(current => ({ ...current, ...patch }));
    setNotice("");
  }
  function updateDestination(index: number, patch: Partial<QuickDestination>) {
    update({ destinations: form.destinations.map((d, i) => i === index ? { ...d, ...patch } : d) });
  }
  function addDestination() {
    // Client-generated identity is not a database ID. The associated project
    // is chosen separately and validated against this institution's DB on save.
    const id = "intent-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    update({ destinations: [...form.destinations, { id, type: "intention", label: "", enabled: false, projectId: null }] });
  }
  async function save() {
    setError(""); setNotice(""); setSaving(true);
    try {
      const amounts = amountText.split(/[,،\n]/).map(x => Number(x.trim()));
      // Preserve false in the draft: public placement/checkout wiring is not
      // complete, and the admin should not mistake saving for going live.
      const config = validateInstitutionQuickDonation({ ...form, enabled: false, amounts });
      const res = await fetch("/api/quick-donation", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify({ config }),
      });
      const body: { error?: string; config?: InstitutionQuickDonation } = await res.json();
      if (!res.ok) throw new Error(body.error ?? "تعذر حفظ الإعدادات");
      setForm(config);
      setNotice("تم حفظ المسودة الخاصة بقرة العيون. العرض العام غير مفعل حتى اكتمال الاختبارات والربط.");
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر الحفظ"); }
    finally { setSaving(false); }
  }

  return <div dir="rtl" className="max-w-6xl mx-auto space-y-5 pb-12">
    <PageHeader title="التبرع السريع" eyebrow="إعدادات قرة العيون"
      description="إدارة مسودة مبالغ التبرع والوجهات والعناوين. لا يتم نقل أي مشروع أو إعداد من جمعية أخرى."
      icon={HeartHandshake} actions={<button type="button" onClick={save} disabled={busy || saving || !loadedAt}
        className="flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-white disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} حفظ المسودة
      </button>}/>
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      التبرع السريع غير مفعّل على الموقع العام. حفظ هذه الإعدادات لا ينشئ تبرعًا، ولا يغير بوابة الدفع أو جداول التجديد.
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{notice}</div>}
    {busy ? <div className="flex items-center gap-2 p-10"><Loader2 className="animate-spin"/> جارٍ تحميل الإعدادات...</div>
      : <div className="grid gap-5 lg:grid-cols-2">
      <section className={section}>
        <h2 className="font-bold text-lg">المبالغ والعملة</h2>
        <label className="block space-y-2 text-sm">عملة التبرع المقترحة
          <select className={fields} value={form.currency} onChange={e => update({ currency: e.target.value })}>
            {SUPPORTED_CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
          </select>
        </label>
        <label className="block space-y-2 text-sm">المبالغ (من 2 إلى 6 مبالغ، بفواصل)
          <input className={fields} value={amountText} onChange={e => setAmountText(e.target.value)}
            placeholder="10, 25, 50, 100" inputMode="decimal"/>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.customAmount} onChange={e => update({ customAmount: e.target.checked })}/>
          السماح بإدخال مبلغ مخصص
        </label>
        <h3 className="font-semibold">الدوريات الممكنة</h3>
        <p className="text-xs text-slate-500">لن يتم عرض دورية على الموقع إلا بعد إثبات دعمها في النظام المالي القائم.</p>
        <div className="grid grid-cols-2 gap-2">
          {FREQ.map(f => <label key={f.code} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.cadences.includes(f.code)} onChange={e => {
              const next = e.target.checked ? [...form.cadences, f.code] : form.cadences.filter(c => c !== f.code);
              update({ cadences: next, defaultCadence: next.includes(form.defaultCadence) ? form.defaultCadence : next[0] ?? "once" });
            }}/>{f.label}
          </label>)}
        </div>
        <label className="block space-y-2 text-sm">الدورية الافتراضية
          <select className={fields} value={form.defaultCadence} onChange={e => update({ defaultCadence: e.target.value as QuickCadence })}>
            {FREQ.filter(f => form.cadences.includes(f.code)).map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
          </select>
        </label>
      </section>
      <section className={section}>
        <h2 className="font-bold text-lg">الظهور على الأجهزة</h2>
        {([["desktop","سطح المكتب"],["mobile","الهاتف"],["sticky","الشريط العائم"]] as const).map(([key,label]) =>
          <label key={key} className="flex items-center justify-between text-sm border-b py-3">
            {label}<input type="checkbox" checked={form.display[key]}
              onChange={e => update({ display: { ...form.display, [key]: e.target.checked } })}/>
          </label>)}
        <h2 className="font-bold text-lg pt-2">عنوان البطاقة بكل لغة</h2>
        {SUPPORTED_LOCALES.map(locale => <label key={locale} className="block space-y-1 text-sm">
          <span>{locale.toUpperCase()}</span>
          <input className={fields} value={form.titles[locale] ?? ""} onChange={e =>
            update({ titles: { ...form.titles, [locale]: e.target.value } })} maxLength={100}/>
        </label>)}
      </section>
      <section className={section + " lg:col-span-2"}>
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div><h2 className="font-bold text-lg">وجهات التبرع</h2>
            <p className="text-sm text-slate-500">كل وجهة مرتبطة بمشروع حقيقي من قرة العيون؛ الربط الفارغ لا يُتاح للمتبرع.</p></div>
          <button type="button" onClick={addDestination} className="flex items-center gap-2 border rounded-xl px-3 py-2 text-sm">
            <Plus className="h-4 w-4"/> إضافة وجهة
          </button>
        </div>
        {form.destinations.length === 0 && <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">لم تُضف وجهات بعد.</p>}
        {form.destinations.map((d, index) => <div key={d.id} className="grid items-end gap-3 rounded-xl border bg-slate-50 p-3 md:grid-cols-[1fr_1.4fr_auto_auto]">
          <label className="block space-y-1 text-xs">العنوان الظاهر
            <input className={fields} value={d.label} onChange={e => updateDestination(index, { label: e.target.value })}
              placeholder="مثال: زكاة المال" maxLength={100}/>
          </label>
          <label className="block space-y-1 text-xs">المشروع المعتمد
            <select className={fields} value={d.projectId ?? ""} onChange={e => updateDestination(index, { projectId: e.target.value || null })}>
              <option value="">اختر مشروعًا</option>
              {campaigns.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
              {d.projectId && !campaigns.some(p => p.id === d.projectId) && <option value={d.projectId}>مشروع محفوظ — راجع حالته</option>}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={d.enabled} onChange={e => updateDestination(index, { enabled: e.target.checked })}/> متاح
          </label>
          <button type="button" onClick={() => update({
            destinations: form.destinations.filter(item => item.id !== d.id),
            defaultDestinationId: form.defaultDestinationId === d.id ? null : form.defaultDestinationId,
          })} className="flex items-center justify-center rounded-xl border border-red-200 p-3 text-red-700" aria-label="حذف الوجهة">
            <Trash2 className="h-4 w-4"/>
          </button>
        </div>)}
        <label className="block space-y-2 text-sm">الوجهة الافتراضية
          <select className={fields} value={form.defaultDestinationId ?? ""} onChange={e => update({ defaultDestinationId: e.target.value || null })}>
            <option value="">أول وجهة متاحة</option>
            {form.destinations.filter(d => d.enabled && d.projectId).map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        {campaigns.length >= 500 && <p className="text-amber-800 text-xs">يُرجى التحقق من المشاريع غير المعروضة؛ قائمة البحث الحالية محدودة بـ500 نتيجة.</p>}
      </section>
    </div>}
  </div>;
}
