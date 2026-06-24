"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Edit3, Loader2, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArchiveCollection, ArchiveProject } from "@/lib/archive/archive-types";

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => String(new Date().getFullYear() - index));
const CITY_OPTIONS = ["غزة", "القدس", "الخرطوم", "إدلب", "إسطنبول", "صنعاء", "عام"];
const THEME_OPTIONS = ["مياه", "طرود", "إفطار", "كفالات", "زكاة", "وقف", "تعليم", "صحة", "إيواء", "أضاحي"];
const COUNTRY_OPTIONS = ["فلسطين", "السودان", "سوريا", "تركيا", "اليمن", "لبنان", "عام"];
const PROJECT_TYPE_OPTIONS = ["إغاثة طارئة", "مشروع موسمي", "مشروع دائم", "توثيق ميداني", "حملة تسويقية", "ملف رسمي"];

type Props = { project: ArchiveProject; collections: ArchiveCollection[] };
type Feedback = { tone: "success" | "error"; message: string } | null;

export function ArchiveProjectManageActions({ project, collections }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [collectionId, setCollectionId] = useState(project.collectionId || "");
  const [title, setTitle] = useState(project.title);
  const [year, setYear] = useState(String(project.year || new Date().getFullYear()));
  const [country, setCountry] = useState(project.country || COUNTRY_OPTIONS[0]);
  const [city, setCity] = useState(project.city || CITY_OPTIONS[0]);
  const [theme, setTheme] = useState(project.theme || THEME_OPTIONS[0]);
  const [projectType, setProjectType] = useState(project.projectType || PROJECT_TYPE_OPTIONS[0]);
  const [description, setDescription] = useState(project.description || "");
  const [notes, setNotes] = useState(project.notes || "");

  function resetFields() {
    setCollectionId(project.collectionId || "");
    setTitle(project.title);
    setYear(String(project.year || new Date().getFullYear()));
    setCountry(project.country || COUNTRY_OPTIONS[0]);
    setCity(project.city || CITY_OPTIONS[0]);
    setTheme(project.theme || THEME_OPTIONS[0]);
    setProjectType(project.projectType || PROJECT_TYPE_OPTIONS[0]);
    setDescription(project.description || "");
    setNotes(project.notes || "");
    setFeedback(null);
  }

  async function saveChanges() {
    if (busy || !title.trim()) return;
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear)) {
      setFeedback({ tone: "error", message: "السنة غير صحيحة" });
      return;
    }

    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/admin/archive/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id, collectionId, title: title.trim(), year: parsedYear, country, city, theme, projectType, description, notes }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر حفظ التعديلات" });
      return;
    }
    setFeedback({ tone: "success", message: result?.message || "تم حفظ التعديلات" });
    setEditing(false);
    router.refresh();
  }

  async function removeItem() {
    if (busy || !window.confirm("هل تريد حذف هذا المشروع؟")) return;
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/admin/archive/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر تنفيذ الإجراء" });
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-white p-2">
      {editing ? (
        <div className="grid gap-2">
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="المجموعة">
              <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]">
                <option value="">بدون مجموعة</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
            </Field>
            <Field label="اسم المشروع">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]" />
            </Field>
            <Field label="السنة">
              <select value={year} onChange={(event) => setYear(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]">
                {YEAR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <Field label="البلد"><select value={country} onChange={(event) => setCountry(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]">{COUNTRY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="المدينة"><select value={city} onChange={(event) => setCity(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]">{CITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="التصنيف"><select value={theme} onChange={(event) => setTheme(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]">{THEME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="نوع المشروع"><select value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]">{PROJECT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="الوصف"><input value={description} onChange={(event) => setDescription(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]" /></Field>
            <Field label="ملاحظات"><input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]" /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={saveChanges} disabled={busy} className="h-8 gap-1.5 px-2.5 text-xs font-bold">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              حفظ
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetFields} disabled={busy} className="h-8 gap-1.5 px-2.5 text-xs font-bold">
              <RotateCcw className="h-3.5 w-3.5" /> استرجاع
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { resetFields(); setEditing(false); }} disabled={busy} className="h-8 gap-1.5 px-2.5 text-xs font-bold">
              <X className="h-3.5 w-3.5" /> إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} className="h-8 gap-1.5 px-2.5 text-xs font-bold"><Edit3 className="h-3.5 w-3.5" /> تعديل</Button>
          <Button type="button" size="sm" variant="outline" onClick={removeItem} disabled={busy} className="h-8 gap-1.5 px-2.5 text-xs font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" /> حذف</Button>
        </div>
      )}
      {feedback ? <p className={`mt-2 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-[11px] font-bold text-slate-600">{label}{children}</label>;
}
