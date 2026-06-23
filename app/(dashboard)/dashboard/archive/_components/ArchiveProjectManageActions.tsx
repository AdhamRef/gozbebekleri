"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Edit3, Loader2, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArchiveCollection, ArchiveProject } from "@/lib/archive/archive-types";

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
  const [country, setCountry] = useState(project.country || "");
  const [city, setCity] = useState(project.city || "");
  const [theme, setTheme] = useState(project.theme || "");
  const [projectType, setProjectType] = useState(project.projectType || "");
  const [description, setDescription] = useState(project.description || "");
  const [notes, setNotes] = useState(project.notes || "");

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
    <div className="mt-4 rounded-lg border bg-white p-3">
      {editing ? (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="المجموعة">
              <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]">
                <option value="">بدون مجموعة</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
            </Field>
            <Field label="اسم المشروع">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
            </Field>
            <Field label="السنة">
              <input inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="البلد"><input value={country} onChange={(event) => setCountry(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" /></Field>
            <Field label="المدينة"><input value={city} onChange={(event) => setCity(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" /></Field>
            <Field label="التصنيف"><input value={theme} onChange={(event) => setTheme(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" /></Field>
            <Field label="نوع المشروع"><input value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" /></Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="الوصف"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-16 rounded-md border px-3 py-2 text-sm outline-none focus:border-[#025EB8]" /></Field>
            <Field label="ملاحظات"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-16 rounded-md border px-3 py-2 text-sm outline-none focus:border-[#025EB8]" /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={saveChanges} disabled={busy} className="gap-2 font-bold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy} className="gap-2 font-bold">
              <X className="h-4 w-4" /> إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2 font-bold"><Edit3 className="h-4 w-4" /> تعديل</Button>
          <Button type="button" size="sm" variant="outline" onClick={removeItem} disabled={busy} className="gap-2 font-bold text-rose-700"><Trash2 className="h-4 w-4" /> حذف</Button>
        </div>
      )}
      {feedback ? <p className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-xs font-bold text-slate-600">{label}{children}</label>;
}
