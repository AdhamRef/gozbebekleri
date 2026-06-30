"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OperationsSeasonCreateAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    focus: "",
    status: "PLANNING",
    period: "",
    required: 0,
    ready: 0,
    progress: 0,
  });

  async function saveSeason() {
    setBusy(true);
    setError(null);

    const title = form.title.trim();
    if (!title) {
      setBusy(false);
      setError("اكتب اسم الموسم أولًا");
      return;
    }

    const item = {
      id: `seasons-${Date.now()}`,
      title,
      focus: form.focus.trim() || "تركيز جديد",
      status: form.status,
      period: form.period.trim() || "غير محدد",
      required: Number.isFinite(form.required) ? form.required : 0,
      ready: Number.isFinite(form.ready) ? form.ready : 0,
      progress: Number.isFinite(form.progress) ? form.progress : 0,
    };

    const response = await fetch("/api/dashboard/operations/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "seasons", operation: "SAVE", item }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل حفظ الموسم");
      return;
    }

    setForm({ title: "", focus: "", status: "PLANNING", period: "", required: 0, ready: 0, progress: 0 });
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-dashed bg-white p-3">
      <Button type="button" size="sm" variant="outline" className="gap-2 font-bold" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
        {open ? "إغلاق" : "إضافة موسم معتمد"}
      </Button>

      {open ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">
            اسم الموسم
            <input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">
            التركيز
            <input value={form.focus} onChange={(event) => setForm((value) => ({ ...value, focus: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            الحالة
            <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]">
              <option value="PLANNING">تخطيط</option>
              <option value="ACTIVE">نشط</option>
              <option value="UPCOMING">قادم</option>
              <option value="DONE">منتهي</option>
            </select>
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            الفترة
            <input value={form.period} onChange={(event) => setForm((value) => ({ ...value, period: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            المطلوب
            <input type="number" value={form.required} onChange={(event) => setForm((value) => ({ ...value, required: event.target.valueAsNumber }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            الجاهز
            <input type="number" value={form.ready} onChange={(event) => setForm((value) => ({ ...value, ready: event.target.valueAsNumber }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            نسبة الإنجاز
            <input type="number" value={form.progress} onChange={(event) => setForm((value) => ({ ...value, progress: event.target.valueAsNumber }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" size="sm" disabled={busy} onClick={saveSeason}>
              <Save className="h-3.5 w-3.5" /> حفظ الموسم
            </Button>
          </div>
          {error ? <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
