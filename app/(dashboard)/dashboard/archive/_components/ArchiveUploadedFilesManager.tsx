"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Category = "MARKETING" | "DOCUMENTS";

type UploadedFile = {
  id: string;
  category: Category;
  title: string;
  notes?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  createdAt: string;
  uploadedBy: string;
};

type Props = {
  category: Category;
  title: string;
  description: string;
};

export function ArchiveUploadedFilesManager({ category, title, description }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileTitle, setFileTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function loadFiles() {
    setLoading(true);
    const response = await fetch(`/api/admin/archive/uploaded-files?category=${category}`, { cache: "no-store" });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر تحميل الملفات" });
      return;
    }
    setFiles(result.files ?? []);
  }

  useEffect(() => {
    void loadFiles();
  }, [category]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file || saving) {
      setFeedback({ tone: "error", message: "اختر ملف PDF أو Excel أولًا." });
      return;
    }

    const formData = new FormData();
    formData.set("category", category);
    formData.set("title", fileTitle.trim() || file.name);
    formData.set("notes", notes.trim());
    formData.set("file", file);

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/archive/uploaded-files", { method: "POST", body: formData });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر رفع الملف" });
        return;
      }
      setFeedback({ tone: "success", message: "تم رفع الملف" });
      setFileTitle("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      await loadFiles();
    } catch {
      setFeedback({ tone: "error", message: "تعذر رفع الملف" });
    } finally {
      setSaving(false);
    }
  }

  async function removeFile(id: string) {
    if (!window.confirm("هل تريد حذف هذا الملف؟")) return;
    const response = await fetch(`/api/admin/archive/uploaded-files/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر حذف الملف" });
      return;
    }
    setFeedback({ tone: "success", message: "تم حذف الملف" });
    await loadFiles();
  }

  return (
    <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black text-[#025EB8]">الأرشيف</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
          </div>
          <Link href="/dashboard/archive" className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]">
            الرجوع للأرشيف
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-base font-black text-slate-950">رفع ملف جديد</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">اختر ملف PDF أو Excel من جهازك ليتم حفظه داخل الأرشيف.</p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
          <input value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} placeholder="اسم الملف" className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات" className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
          <input ref={fileRef} type="file" accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="h-9 rounded-md border bg-white px-2 py-1.5 text-sm file:ml-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-bold file:text-slate-700" />
          <Button type="button" onClick={upload} disabled={saving} className="h-9 gap-2 font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع
          </Button>
        </div>
      </section>

      {feedback ? (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}

      <section className="mt-4 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-black text-slate-950">الملفات</h2>
            <p className="mt-1 text-xs text-slate-600">إجمالي الملفات: {files.length}</p>
          </div>
          <FileText className="h-5 w-5 text-[#025EB8]" />
        </div>
        <div className="overflow-x-auto p-4">
          {loading ? (
            <p className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">جاري تحميل الملفات...</p>
          ) : files.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-slate-600">لا توجد ملفات مرفوعة بعد.</p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-right">اسم الملف</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">الحجم</th>
                  <th className="p-3 text-right">تاريخ الرفع</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {files.map((file) => (
                  <tr key={file.id}>
                    <td className="p-3">
                      <p className="font-black text-slate-950">{file.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{file.fileName}</p>
                    </td>
                    <td className="p-3 font-bold text-slate-700">{file.extension?.toUpperCase() || "FILE"}</td>
                    <td className="p-3 text-slate-700">{formatBytes(file.sizeBytes)}</td>
                    <td className="p-3 text-slate-700">{formatDate(file.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <a href={`/api/admin/archive/uploaded-files/${file.id}/download`} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]">
                          <Download className="h-3.5 w-3.5" /> تنزيل
                        </a>
                        <button type="button" onClick={() => void removeFile(file.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-rose-700 hover:border-rose-300">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatBytes(value: number) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
