"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { FolderKanban, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArchiveCollection } from "@/lib/archive/archive-types";

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => String(new Date().getFullYear() - index));
const COUNTRY_OPTIONS = ["فلسطين", "السودان", "سوريا", "تركيا", "اليمن", "لبنان", "عام"];
const CITY_OPTIONS = ["غزة", "القدس", "الخرطوم", "إدلب", "إسطنبول", "صنعاء", "عام"];
const THEME_OPTIONS = ["مياه", "طرود", "إفطار", "كفالات", "زكاة", "وقف", "تعليم", "صحة", "إيواء", "أضاحي"];
const PROJECT_TYPE_OPTIONS = ["إغاثة طارئة", "مشروع موسمي", "مشروع دائم", "توثيق ميداني", "حملة تسويقية", "ملف رسمي"];

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

type Props = {
  collections: ArchiveCollection[];
  defaultYear?: number;
};

export function ArchiveProjectCreatePanel({ collections, defaultYear }: Props) {
  const router = useRouter();
  const currentYear = String(defaultYear ?? new Date().getFullYear());
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(currentYear);
  const [country, setCountry] = useState(COUNTRY_OPTIONS[0]);
  const [city, setCity] = useState(CITY_OPTIONS[0]);
  const [theme, setTheme] = useState(THEME_OPTIONS[0]);
  const [projectType, setProjectType] = useState(PROJECT_TYPE_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const collectionOptions = useMemo(() => collections.map((collection) => ({ id: collection.id, label: collection.name })), [collections]);

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!title.trim()) {
      setFeedback({ tone: "error", message: "اكتب اسم المشروع أولًا." });
      return;
    }

    const parsedYear = year.trim() ? Number(year) : undefined;
    if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100)) {
      setFeedback({ tone: "error", message: "اختر سنة صحيحة." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/archive/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collectionId: collectionId || undefined,
        title: title.trim(),
        year: parsedYear,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        theme: theme.trim() || undefined,
        projectType: projectType.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر حفظ المشروع" });
      return;
    }

    setTitle("");
    setYear(currentYear);
    setDescription("");
    setNotes("");
    setFeedback({ tone: "success", message: result?.message || "تم حفظ المشروع" });
    router.refresh();
  }

  return (
    <form onSubmit={submitProject} className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <FolderKanban className="h-4 w-4 text-[#025EB8]" /> إضافة مشروع
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">أضف المشروع بسرعة، ثم أضف رابط التوثيق من صفحة المشروع.</p>
        </div>
        <Button type="submit" size="sm" disabled={saving} className="h-8 gap-2 px-3 text-xs font-bold">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "جاري الحفظ" : "حفظ"}
        </Button>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1.5fr_0.6fr_0.8fr_0.8fr]">
        <Field label="المجموعة">
          <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#025EB8]">
            <option value="">بدون مجموعة</option>
            {collectionOptions.map((collection) => <option key={collection.id} value={collection.id}>{collection.label}</option>)}
          </select>
        </Field>
        <Field label="اسم المشروع">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: غزة 2026 - توزيع مياه" className="h-9 rounded-md border bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#025EB8]" />
        </Field>
        <Field label="السنة">
          <select value={year} onChange={(event) => setYear(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#025EB8]">
            {YEAR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="المدينة">
          <select value={city} onChange={(event) => setCity(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]">
            {CITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="التصنيف">
          <select value={theme} onChange={(event) => setTheme(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]">
            {THEME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[0.9fr_0.9fr_1fr_1fr]">
        <Field label="البلد">
          <select value={country} onChange={(event) => setCountry(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]">
            {COUNTRY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="نوع المشروع">
          <select value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]">
            {PROJECT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="الوصف">
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وصف مختصر" className="h-9 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]" />
        </Field>
        <Field label="ملاحظات">
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات داخلية" className="h-9 rounded-md border bg-white px-2 text-xs text-slate-900 outline-none focus:border-[#025EB8]" />
        </Field>
      </div>

      {feedback ? (
        <p className={`mt-2 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-[11px] font-bold text-slate-600">{label}{children}</label>;
}
