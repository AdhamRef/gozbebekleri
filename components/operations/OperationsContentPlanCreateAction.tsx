"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OperationsContentPlanCreateAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    theme: "",
    status: "PLANNING",
    items: 0,
    published: 0,
    date: "",
  });

  async function savePlan() {
    setBusy(true);
    setError(null);

    const title = form.title.trim();
    if (!title) {
      setBusy(false);
      setError("اكتب اسم الخطة أولًا");
      return;
    }

    const item = {
      id: `plans-${Date.now()}`,
      title,
      theme: form.theme.trim() || "محور جديد",
      status: form.status,
      items: Number.isFinite(form.items) ? form.items : 0,
      published: Number.isFinite(form.published) ? form.published : 0,
      date: form.date.trim() || "غير محدد",
    };

    const response = await fetch("/api/dashboard/operations/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "plans", operation: "SAVE", item }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل حفظ الخطة");
      return;
    }

    setForm({ title: "", theme: "", status: "PLANNING", items: 0, published: 0, date: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-dashed bg-white p-3">
      <Button type="button" size="sm" variant="outline" className="gap-2 font-bold" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
        {open ? "إغلاق" : "إضافة خطة معتمدة"}
      </Button>

      {open ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">
            اسم الخطة
            <input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">
            المحور
            <input value={form.theme} onChange={(event) => setForm((value) => ({ ...value, theme: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            الحالة
            <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]">
              <option value="PLANNING">تخطيط</option>
              <option value="ACTIVE">نشط</option>
              <option value="DONE">منتهي</option>
            </select>
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            الفترة
            <input value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            عدد العناصر
            <input type="number" value={form.items} onChange={(event) => setForm((value) => ({ ...value, items: event.target.valueAsNumber }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            المنجز
            <input type="number" value={form.published} onChange={(event) => setForm((value) => ({ ...value, published: event.target.valueAsNumber }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" size="sm" disabled={busy} onClick={savePlan}>
              <Save className="h-3.5 w-3.5" /> حفظ الخطة
            </Button>
          </div>
          {error ? <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
