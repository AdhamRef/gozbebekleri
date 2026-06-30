"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OperationsWeeklyThemeCreateAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ week: "", theme: "", description: "" });

  async function saveTheme() {
    setBusy(true);
    setError(null);

    const week = form.week.trim();
    const theme = form.theme.trim();
    if (!week || !theme) {
      setBusy(false);
      setError("اكتب الأسبوع والمحور أولًا");
      return;
    }

    const item = {
      id: `weeklyThemes-${Date.now()}`,
      week,
      theme,
      description: form.description.trim() || "محور إنتاج جديد",
    };

    const response = await fetch("/api/dashboard/operations/foundation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "weeklyThemes", operation: "SAVE", item }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل حفظ المحور");
      return;
    }

    setForm({ week: "", theme: "", description: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-2xl border border-dashed bg-slate-50 p-3">
      <Button type="button" size="sm" variant="outline" className="gap-2 font-bold" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
        {open ? "إغلاق" : "إضافة محور أسبوعي"}
      </Button>

      {open ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <label className="space-y-1 font-semibold text-slate-600">
            الأسبوع
            <input value={form.week} onChange={(event) => setForm((value) => ({ ...value, week: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600">
            المحور
            <input value={form.theme} onChange={(event) => setForm((value) => ({ ...value, theme: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">
            الوصف
            <input value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" size="sm" disabled={busy} onClick={saveTheme}>
              <Save className="h-3.5 w-3.5" /> حفظ المحور
            </Button>
          </div>
          {error ? <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
