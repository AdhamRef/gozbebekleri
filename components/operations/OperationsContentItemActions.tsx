"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, CheckCircle2, ClipboardCheck, Megaphone, MoreHorizontal, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationsContentItem } from "@/lib/operations/types";

type OperationsContentItemActionsProps = { item: OperationsContentItem };

type FormState = {
  title: string;
  type: string;
  status: string;
  channel: string;
  due: string;
  owner: string;
  language: string;
  theme: string;
  hook: string;
  cta: string;
  copy: string;
  figmaUrl: string;
  driveUrl: string;
  videoUrl: string;
  finalAssetUrl: string;
};

const statusOptions = [
  ["IDEA", "فكرة"],
  ["WRITING", "كتابة"],
  ["DESIGN", "تصميم"],
  ["REVIEW", "مراجعة"],
  ["APPROVED", "معتمد"],
  ["SCHEDULED", "مجدول"],
  ["PUBLISHED", "منشور"],
] as const;

function text(value: string | null | undefined) {
  return value ?? "";
}

function itemFormState(item: OperationsContentItem): FormState {
  return {
    title: item.title,
    type: item.type,
    status: item.status,
    channel: item.channel,
    due: item.due,
    owner: text(item.owner),
    language: text(item.language),
    theme: text(item.theme),
    hook: text(item.hook),
    cta: text(item.cta),
    copy: text(item.copy),
    figmaUrl: text(item.figmaUrl),
    driveUrl: text(item.driveUrl),
    videoUrl: text(item.videoUrl),
    finalAssetUrl: text(item.finalAssetUrl),
  };
}

function optional(value: string) {
  return value.trim() || undefined;
}

function itemPayload(item: OperationsContentItem, override: Partial<FormState> = {}) {
  const next = { ...itemFormState(item), ...override };
  return {
    id: item.id,
    title: next.title,
    type: next.type,
    status: next.status,
    channel: next.channel,
    due: next.due,
    owner: optional(next.owner),
    language: optional(next.language),
    theme: optional(next.theme),
    hook: optional(next.hook),
    cta: optional(next.cta),
    copy: optional(next.copy),
    figmaUrl: optional(next.figmaUrl),
    driveUrl: optional(next.driveUrl),
    videoUrl: optional(next.videoUrl),
    finalAssetUrl: optional(next.finalAssetUrl),
  };
}

export function OperationsContentItemActions({ item }: OperationsContentItemActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => itemFormState(item));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!item.id) return null;

  async function sendPatch(payload: Record<string, unknown>, successMessage: string) {
    setBusy(String(payload.operation ?? payload.status ?? "SAVE"));
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/dashboard/operations/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل تحديث عنصر المحتوى");
      return false;
    }

    setSuccess(successMessage);
    router.refresh();
    return true;
  }

  async function updateStatus(nextStatus: string) {
    if (nextStatus === "PUBLISHED" && !window.confirm("تأكيد تسجيل النشر اليدوي؟ سيتم تحديث الحالة فقط.")) return;
    await sendPatch({ ...itemPayload(item, { status: nextStatus }), publicationNotes: nextStatus === "PUBLISHED" ? "تم تسجيل النشر اليدوي من لوحة المحتوى." : undefined }, nextStatus === "PUBLISHED" ? "تم تسجيل النشر اليدوي" : "تم تحديث حالة عنصر المحتوى");
  }

  async function saveEdits() {
    const saved = await sendPatch(itemPayload(item, form), "تم حفظ التعديل");
    if (saved) setEditing(false);
  }

  async function removeItem() {
    if (!window.confirm("هل تريد حذف هذا العنصر من لوحة المحتوى؟")) return;
    await sendPatch({ ...itemPayload(item), operation: "REMOVE" }, "تم حذف عنصر المحتوى");
  }

  const isPublished = item.status === "PUBLISHED";

  return (
    <div className="mt-3 border-t pt-3">
      <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => setOpen((value) => !value)} className="h-8 gap-1.5 px-2 text-xs font-bold text-slate-500 hover:text-slate-900">
        {open ? <X className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
        {open ? "إغلاق الإجراءات" : "إجراءات"}
      </Button>

      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => setEditing((value) => !value)}>{editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{editing ? "إلغاء" : "تعديل"}</Button>
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={removeItem} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /> حذف</Button>
            {item.status !== "REVIEW" && !isPublished ? <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("REVIEW")}><ClipboardCheck className="h-3.5 w-3.5" /> مراجعة</Button> : null}
            {item.status !== "APPROVED" && !isPublished ? <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("APPROVED")}><CheckCircle2 className="h-3.5 w-3.5" /> اعتماد</Button> : null}
            {item.status !== "SCHEDULED" && !isPublished ? <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("SCHEDULED")}><CalendarCheck2 className="h-3.5 w-3.5" /> جدولة</Button> : null}
            {!isPublished ? <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("PUBLISHED")}><Megaphone className="h-3.5 w-3.5" /> نشر يدوي</Button> : null}
          </div>

          {editing ? (
            <div className="grid gap-2 rounded-xl border bg-slate-50 p-3 text-xs sm:grid-cols-2">
              <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">العنوان<input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">النوع<input value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">الحالة<select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="space-y-1 font-semibold text-slate-600">القناة<input value={form.channel} onChange={(event) => setForm((value) => ({ ...value, channel: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">الموعد<input value={form.due} onChange={(event) => setForm((value) => ({ ...value, due: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">المسؤول<input value={form.owner} onChange={(event) => setForm((value) => ({ ...value, owner: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">اللغة<input value={form.language} onChange={(event) => setForm((value) => ({ ...value, language: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">المحور<input value={form.theme} onChange={(event) => setForm((value) => ({ ...value, theme: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">الفكرة / Hook<input value={form.hook} onChange={(event) => setForm((value) => ({ ...value, hook: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">الدعوة / CTA<input value={form.cta} onChange={(event) => setForm((value) => ({ ...value, cta: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">رابط Figma<input value={form.figmaUrl} onChange={(event) => setForm((value) => ({ ...value, figmaUrl: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">رابط Drive<input value={form.driveUrl} onChange={(event) => setForm((value) => ({ ...value, driveUrl: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">رابط الفيديو<input value={form.videoUrl} onChange={(event) => setForm((value) => ({ ...value, videoUrl: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600">النسخة النهائية<input value={form.finalAssetUrl} onChange={(event) => setForm((value) => ({ ...value, finalAssetUrl: event.target.value }))} className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <label className="space-y-1 font-semibold text-slate-600 sm:col-span-2">النص / ملاحظات الإنتاج<textarea value={form.copy} onChange={(event) => setForm((value) => ({ ...value, copy: event.target.value }))} className="min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#025EB8]" /></label>
              <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" size="sm" disabled={busy !== null} onClick={saveEdits}><Save className="h-3.5 w-3.5" /> حفظ التعديل</Button><Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => { setForm(itemFormState(item)); setEditing(false); }}>إلغاء</Button></div>
            </div>
          ) : null}

          <p className="text-[11px] font-semibold leading-5 text-slate-500">كل تعديل أو حذف يتم حفظه في سجل العمليات.</p>
          {busy ? <p className="text-xs font-semibold text-slate-500">جاري التحديث...</p> : null}
          {success ? <p className="text-xs font-semibold text-emerald-600">{success}</p> : null}
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
