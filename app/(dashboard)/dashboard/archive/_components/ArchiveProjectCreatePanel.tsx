"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { FolderKanban, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArchiveCollection } from "@/lib/archive/archive-types";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

type Props = {
  collections: ArchiveCollection[];
};

export function ArchiveProjectCreatePanel({ collections }: Props) {
  const router = useRouter();
  const currentYear = String(new Date().getFullYear());
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(currentYear);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [theme, setTheme] = useState("");
  const [projectType, setProjectType] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const collectionOptions = useMemo(() => collections.map((collection) => ({ id: collection.id, label: `${collection.name} / ${collection.type}` })), [collections]);

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!title.trim()) {
      setFeedback({ tone: "error", message: "اكتب اسم مشروع الأرشيف أولًا." });
      return;
    }

    const parsedYear = year.trim() ? Number(year) : undefined;
    if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100)) {
      setFeedback({ tone: "error", message: "السنة يجب أن تكون بين 2000 و2100." });
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
      setFeedback({ tone: "error", message: result?.error || result?.message || "فشل إنشاء مشروع الأرشيف" });
      return;
    }

    setTitle("");
    setYear(currentYear);
    setCountry("");
    setCity("");
    setTheme("");
    setProjectType("");
    setDescription("");
    setNotes("");
    setFeedback({ tone: "success", message: result?.message || "تم إنشاء مشروع الأرشيف" });
    router.refresh();
  }

  return (
    <form onSubmit={submitProject} className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-slate-950">
            <FolderKanban className="h-4 w-4 text-[#025EB8]" /> Create Archive Project
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">مشروع توثيق ميداني يمكن ربطه لاحقًا بـ Drive Links وAssets. لا يوجد نشر أو تحليل تلقائي.</p>
        </div>
        <Button type="submit" size="sm" disabled={saving} className="gap-2 font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "جاري الحفظ" : "Save Project"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.4fr_0.6fr]">
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Collection
          <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]">
            <option value="">Unassigned</option>
            {collectionOptions.map((collection) => <option key={collection.id} value={collection.id}>{collection.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Project title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: غزة 2026 - توزيع مياه" className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Year
          <input inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Country
          <input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Palestine" className="h-10 rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          City
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Gaza / Al-Quds" className="h-10 rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Theme
          <input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="water / waqf / zakat" className="h-10 rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Project type
          <input value={projectType} onChange={(event) => setProjectType(event.target.value)} placeholder="Emergency Aid" className="h-10 rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وصف مختصر للمشروع والمواد المتوقعة." className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات التوثيق أو ما يجب التحقق منه." className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
      </div>

      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">المشروع يبدأ PLANNED / NOT_STARTED / NOT_REVIEWED. أي بيانات ناقصة تظهر كـ to be verified.</p>
      {feedback ? (
        <p className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
