"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { FolderPlus, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function ArchiveCollectionCreatePanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("GENERAL");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function submitCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      setFeedback({ tone: "error", message: "اكتب اسم المجموعة أولًا." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/archive/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim() || undefined,
        type: type.trim() || "GENERAL",
        description: description.trim() || undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "فشل إنشاء مجموعة الأرشيف" });
      return;
    }

    setName("");
    setSlug("");
    setType("GENERAL");
    setDescription("");
    setFeedback({ tone: "success", message: result?.message || "تم إنشاء مجموعة الأرشيف" });
    router.refresh();
  }

  return (
    <form onSubmit={submitCollection} className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-slate-950">
            <FolderPlus className="h-4 w-4 text-[#025EB8]" /> Create Archive Collection
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">مجموعة رئيسية مثل غزة، القدس، رمضان، الوقف أو الزكاة. لا يوجد أي اتصال خارجي.</p>
        </div>
        <Button type="submit" size="sm" disabled={saving} className="gap-2 font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "جاري الحفظ" : "Save Collection"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr_1fr]">
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: غزة" className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Type
          <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]">
            <option value="GENERAL">GENERAL</option>
            <option value="COUNTRY">COUNTRY</option>
            <option value="SEASON">SEASON</option>
            <option value="FUND">FUND</option>
            <option value="THEME">THEME</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Slug optional
          <input dir="ltr" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="gaza" className="h-10 rounded-md border bg-white px-3 text-left font-mono text-sm text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
      </div>

      <label className="mt-3 grid gap-1 text-xs font-bold text-slate-600">
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وصف مختصر للمجموعة وما نوع المواد التي ستضمها." className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-[#025EB8]" />
      </label>

      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">يحفظ داخل Archive repository ويكتب AuditLog فقط. لا مزامنة Drive ولا AI.</p>
      {feedback ? (
        <p className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
