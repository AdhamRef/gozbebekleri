"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, LayoutTemplate } from "lucide-react";

const API = "/api/dashboard/operations/communication/templates/layouts";
const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm";

type Layout = { id: string; name: string; description: string | null; status: string; isDefault: boolean; unsubscribePlaceholder: boolean };

const STATUS_LABEL: Record<string, string> = { DRAFT: "مسودة", READY: "جاهز", ARCHIVED: "مؤرشف" };

export function EmailLayoutManager({ initialLayouts }: { initialLayouts: Layout[] }) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [htmlShell, setHtmlShell] = React.useState("<div>\n  {{content}}\n</div>");
  const [headerHtml, setHeaderHtml] = React.useState("");
  const [footerHtml, setFooterHtml] = React.useState("");
  const [ctaSection, setCtaSection] = React.useState("");
  const [unsubscribe, setUnsubscribe] = React.useState(false);
  const [isDefault, setIsDefault] = React.useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, htmlShell, headerHtml, footerHtml, ctaSection, unsubscribePlaceholder: unsubscribe, isDefault }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.id) { setError(j?.error || "تعذّر إنشاء التصميم"); setSaving(false); return; }
      setCreating(false);
      setName(""); setDescription(""); setHeaderHtml(""); setFooterHtml(""); setCtaSection(""); setUnsubscribe(false); setIsDefault(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setCreating((v) => !v)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white hover:bg-[#024a92]"><Plus className="h-4 w-4" /> تصميم جديد</button>
      </div>

      {creating ? (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">اسم التصميم</span><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">الوصف</span><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">هيكل HTML — يجب أن يحتوي على خانة المحتوى {"{{content}}"}</span><textarea value={htmlShell} onChange={(e) => setHtmlShell(e.target.value)} rows={5} dir="ltr" className={`${inputCls} font-mono text-xs`} /></label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">الترويسة/الشعار</span><textarea value={headerHtml} onChange={(e) => setHeaderHtml(e.target.value)} rows={2} dir="ltr" className={`${inputCls} font-mono text-xs`} /></label>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">قسم زر الإجراء</span><textarea value={ctaSection} onChange={(e) => setCtaSection(e.target.value)} rows={2} dir="ltr" className={`${inputCls} font-mono text-xs`} /></label>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">التذييل</span><textarea value={footerHtml} onChange={(e) => setFooterHtml(e.target.value)} rows={2} dir="ltr" className={`${inputCls} font-mono text-xs`} /></label>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            <label className="flex items-center gap-2"><input type="checkbox" checked={unsubscribe} onChange={(e) => setUnsubscribe(e.target.checked)} /> يتضمّن خانة إلغاء الاشتراك (تسويقي)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> اجعله التصميم الافتراضي</label>
          </div>
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ التصميم</button>
            <button type="button" onClick={() => setCreating(false)} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">إلغاء</button>
          </div>
        </div>
      ) : null}

      {initialLayouts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <LayoutTemplate className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">لا توجد تصاميم إيميل ثابتة بعد.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {initialLayouts.map((l) => (
            <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-slate-900">{l.name}</span>
                <div className="flex gap-1.5">
                  {l.isDefault ? <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">افتراضي</span> : null}
                  <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{STATUS_LABEL[l.status] ?? l.status}</span>
                </div>
              </div>
              {l.description ? <p className="mt-1 text-xs text-slate-500">{l.description}</p> : null}
              {l.unsubscribePlaceholder ? <p className="mt-2 text-[11px] text-slate-400">يتضمّن خانة إلغاء اشتراك</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
