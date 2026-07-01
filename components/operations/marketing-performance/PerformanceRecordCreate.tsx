"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PerformanceRecordCreate() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", platform: "META", campaignName: "", period: "آخر 7 أيام", spend: 0, donations: 0, donationValue: 0, clicks: 0, impressions: 0, conversions: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveRecord() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/dashboard/operations/marketing-performance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "SAVE", item: { ...form, id: `perf_${Date.now()}`, status: "ACTIVE" } }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || "فشل حفظ السجل");
      return;
    }
    setForm({ title: "", platform: "META", campaignName: "", period: "آخر 7 أيام", spend: 0, donations: 0, donationValue: 0, clicks: 0, impressions: 0, conversions: 0 });
    setMessage("تم حفظ سجل الأداء");
    router.refresh();
  }

  return <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <h2 className="font-black text-slate-900">إضافة سجل أداء</h2>
    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3 xl:grid-cols-6">
      <Input label="العنوان" value={form.title} onChange={(value) => setForm((state) => ({ ...state, title: value }))} />
      <Input label="الحملة" value={form.campaignName} onChange={(value) => setForm((state) => ({ ...state, campaignName: value }))} />
      <Select label="المنصة" value={form.platform} onChange={(value) => setForm((state) => ({ ...state, platform: value }))} />
      <Input label="الفترة" value={form.period} onChange={(value) => setForm((state) => ({ ...state, period: value }))} />
      <NumberInput label="الإنفاق" value={form.spend} onChange={(value) => setForm((state) => ({ ...state, spend: value }))} />
      <NumberInput label="التبرعات" value={form.donations} onChange={(value) => setForm((state) => ({ ...state, donations: value }))} />
      <NumberInput label="قيمة التبرعات" value={form.donationValue} onChange={(value) => setForm((state) => ({ ...state, donationValue: value }))} />
      <NumberInput label="النقرات" value={form.clicks} onChange={(value) => setForm((state) => ({ ...state, clicks: value }))} />
      <NumberInput label="الظهور" value={form.impressions} onChange={(value) => setForm((state) => ({ ...state, impressions: value }))} />
      <NumberInput label="التحويلات" value={form.conversions} onChange={(value) => setForm((state) => ({ ...state, conversions: value }))} />
    </div>
    <Button className="mt-3 gap-2 font-bold" disabled={busy || !form.title} onClick={saveRecord}><Save className="h-4 w-4" /> حفظ السجل</Button>
    {message ? <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p> : null}
  </div>;
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 font-bold text-slate-600">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="space-y-1 font-bold text-slate-600">{label}<input type="number" value={value} onChange={(event) => onChange(event.target.valueAsNumber || 0)} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>;
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 font-bold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]"><option value="META">Meta</option><option value="GOOGLE">Google</option><option value="TIKTOK">TikTok</option><option value="X">X</option></select></label>;
}
