"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Edit3, Loader2, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArchiveCollection } from "@/lib/archive/archive-types";

type Props = { collection: ArchiveCollection };
type Feedback = { tone: "success" | "error"; message: string } | null;

export function ArchiveCollectionManageActions({ collection }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [type, setType] = useState(collection.type || "GENERAL");
  const [description, setDescription] = useState(collection.description || "");

  async function saveChanges() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/admin/archive/collections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: collection.id, name: name.trim(), slug: slug.trim(), type: type.trim(), description: description.trim() }),
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
    if (busy || !window.confirm("هل تريد حذف هذه المجموعة؟")) return;
    setBusy(true);
    setFeedback(null);
    const response = await fetch("/api/admin/archive/collections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: collection.id }),
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
            <Field label="اسم المجموعة">
              <input value={name} onChange={(event) => setName(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
            </Field>
            <Field label="النوع">
              <input value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
            </Field>
            <Field label="الرابط المختصر">
              <input dir="ltr" value={slug} onChange={(event) => setSlug(event.target.value)} className="h-9 rounded-md border px-3 text-left font-mono text-sm outline-none focus:border-[#025EB8]" />
            </Field>
          </div>
          <Field label="الوصف">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-16 rounded-md border px-3 py-2 text-sm outline-none focus:border-[#025EB8]" />
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-bold text-slate-600">{label}{children}</label>;
}
