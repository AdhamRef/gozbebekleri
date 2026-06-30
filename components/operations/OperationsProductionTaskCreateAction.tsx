"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OperationsProductionTaskCreateAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", item: "", owner: "", status: "IDEA", due: "" });

  async function saveTask() {
    setBusy(true);
    setError(null);

    const title = form.title.trim();
    if (!title) {
      setBusy(false);
      setError("اكتب اسم المهمة أولًا");
      return;
    }

    const item = {
      id: `tasks-${Date.now()}`,
      title,
      item: form.item.trim() || "غير مرتبط",
      owner: form.owner.trim() || "غير محدد",
      status: form.status,
      due: form.due.trim() || "غير محدد",
    };

    const response = await fetch("/api/dashboard/operations/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "tasks", operation: "SAVE", item }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل حفظ المهمة");
      return;
    }

    setForm({ title: "", item: "", owner: "", status: "IDEA", due: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-dashed bg-white p-3">
      <Button type="button" size="sm" variant="outline" className="gap-2 font-bold" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
        {open ? "إغلاق" : "إضافة مهمة إنتاج"}
      </Button>

      {open ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">
            اسم المهمة
            <input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            مرتبطة بـ
            <input value={form.item} onChange={(event) => setForm((value) => ({ ...value, item: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            المسؤول
            <input value={form.owner} onChange={(event) => setForm((value) => ({ ...value, owner: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            الحالة
            <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]">
              <option value="IDEA">فكرة</option>
              <option value="WRITING">كتابة</option>
              <option value="DESIGN">تصميم</option>
              <option value="IN_PROGRESS">قيد التنفيذ</option>
              <option value="REVIEW">مراجعة</option>
              <option value="APPROVED">معتمد</option>
            </select>
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            موعد التسليم
            <input value={form.due} onChange={(event) => setForm((value) => ({ ...value, due: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" size="sm" disabled={busy} onClick={saveTask}>
              <Save className="h-3.5 w-3.5" /> حفظ المهمة
            </Button>
          </div>
          {error ? <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
