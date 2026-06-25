"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit3, FileText, Loader2, Save, Search, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadArchiveFile } from "./archiveUploadClient";

type Category = "MARKETING" | "DOCUMENTS";
type ReviewStatus = "NEW" | "REVIEWED" | "IMPORTANT";

type UploadedFile = {
  id: string;
  category: Category;
  title: string;
  notes?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  fileCategory?: string;
  reviewStatus?: ReviewStatus;
  uploadStatus?: string;
  storageMode?: string;
  chunkCount?: number;
  createdAt: string;
  uploadedBy: string;
};

type Props = {
  category: Category;
  title: string;
  description: string;
};

const reviewStatuses: { value: ReviewStatus; label: string }[] = [
  { value: "NEW", label: "جديد" },
  { value: "REVIEWED", label: "تمت المراجعة" },
  { value: "IMPORTANT", label: "مهم" },
];

export function ArchiveUploadedFilesManager({ category, title, description }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileTitle, setFileTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", notes: "", fileCategory: "", reviewStatus: "NEW" as ReviewStatus });
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const categoryOptions = useMemo(() => fileCategoryOptions(category), [category]);
  const filteredFiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return files.filter((file) => {
      const matchesSearch = !term || [file.title, file.fileName, file.notes, file.fileCategory].some((value) => (value || "").toLowerCase().includes(term));
      const matchesType = typeFilter === "ALL" || file.extension?.toLowerCase() === typeFilter.toLowerCase();
      const matchesCategory = categoryFilter === "ALL" || file.fileCategory === categoryFilter;
      const matchesStatus = statusFilter === "ALL" || file.reviewStatus === statusFilter;
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [files, search, typeFilter, categoryFilter, statusFilter]);

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

    setSaving(true);
    setProgress(0);
    setFeedback(null);
    try {
      await uploadArchiveFile({ category, title: fileTitle.trim() || file.name, notes: notes.trim(), file, onProgress: setProgress });
      setFeedback({ tone: "success", message: "تم رفع الملف" });
      setFileTitle("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      await loadFiles();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "تعذر رفع الملف" });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(file: UploadedFile) {
    setEditingId(file.id);
    setDraft({
      title: file.title,
      notes: file.notes || "",
      fileCategory: file.fileCategory || categoryOptions[0],
      reviewStatus: file.reviewStatus || "NEW",
    });
    setFeedback(null);
  }

  async function saveEdit(id: string) {
    const response = await fetch(`/api/admin/archive/uploaded-files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر حفظ التعديل" });
      return;
    }
    setFeedback({ tone: "success", message: "تم حفظ التعديل" });
    setEditingId(null);
    await loadFiles();
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
          <p className="mt-1 text-xs leading-5 text-slate-600">اختر ملف PDF أو Excel من جهازك. الملفات الكبيرة تُرفع على أجزاء تلقائيًا.</p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
          <input value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} placeholder="اسم الملف" className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات" className="h-9 rounded-md border px-3 text-sm outline-none focus:border-[#025EB8]" />
          <input ref={fileRef} type="file" accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="h-9 rounded-md border bg-white px-2 py-1.5 text-sm file:ml-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-bold file:text-slate-700" />
          <Button type="button" onClick={upload} disabled={saving} className="h-9 gap-2 font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {saving ? `${progress}%` : "رفع"}
          </Button>
        </div>
        {saving ? <div className="mx-4 mb-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#025EB8] transition-all" style={{ width: `${progress}%` }} /></div> : null}
      </section>

      {feedback ? (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}

      <section className="mt-4 rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">الملفات</h2>
            <p className="mt-1 text-xs text-slate-600">إجمالي الملفات: {filteredFiles.length} من {files.length}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-[1.4fr_0.8fr_1fr_1fr] xl:min-w-[720px]">
            <label className="relative block">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث باسم الملف أو الملاحظات" className="h-9 w-full rounded-md border bg-white pr-8 pl-3 text-sm outline-none focus:border-[#025EB8]" />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-sm outline-none focus:border-[#025EB8]">
              <option value="ALL">كل الأنواع</option>
              <option value="pdf">PDF</option>
              <option value="xls">XLS</option>
              <option value="xlsx">XLSX</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-sm outline-none focus:border-[#025EB8]">
              <option value="ALL">كل التصنيفات</option>
              {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-sm outline-none focus:border-[#025EB8]">
              <option value="ALL">كل الحالات</option>
              {reviewStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          {loading ? (
            <p className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">جاري تحميل الملفات...</p>
          ) : filteredFiles.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-slate-600">لا توجد ملفات مطابقة.</p>
          ) : (
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-right">اسم الملف</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">التصنيف</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الحجم</th>
                  <th className="p-3 text-right">طريقة الحفظ</th>
                  <th className="p-3 text-right">تاريخ الرفع</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFiles.map((file) => {
                  const isEditing = editingId === file.id;
                  return (
                    <tr key={file.id} className="align-top">
                      <td className="p-3">
                        {isEditing ? (
                          <div className="grid gap-2">
                            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]" />
                            <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" className="h-8 rounded-md border px-2 text-xs outline-none focus:border-[#025EB8]" />
                          </div>
                        ) : (
                          <>
                            <p className="font-black text-slate-950">{file.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{file.fileName}</p>
                            {file.notes ? <p className="mt-1 text-xs text-slate-500">{file.notes}</p> : null}
                          </>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-700">{file.extension?.toUpperCase() || "FILE"}</td>
                      <td className="p-3 text-slate-700">
                        {isEditing ? (
                          <select value={draft.fileCategory} onChange={(event) => setDraft((current) => ({ ...current, fileCategory: event.target.value }))} className="h-8 rounded-md border bg-white px-2 text-xs outline-none focus:border-[#025EB8]">
                            {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{file.fileCategory || "عام"}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">
                        {isEditing ? (
                          <select value={draft.reviewStatus} onChange={(event) => setDraft((current) => ({ ...current, reviewStatus: event.target.value as ReviewStatus }))} className="h-8 rounded-md border bg-white px-2 text-xs outline-none focus:border-[#025EB8]">
                            {reviewStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{statusLabel(file.reviewStatus || "NEW")}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">{formatBytes(file.sizeBytes)}</td>
                      <td className="p-3 text-slate-700">{file.storageMode === "CLIENT_CHUNKED" ? `${file.chunkCount || 1} أجزاء` : "مباشر"}</td>
                      <td className="p-3 text-slate-700">{formatDate(file.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => void saveEdit(file.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]"><Save className="h-3.5 w-3.5" /> حفظ</button>
                              <button type="button" onClick={() => setEditingId(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-slate-700"><X className="h-3.5 w-3.5" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(file)} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]"><Edit3 className="h-3.5 w-3.5" /> تعديل</button>
                              <a href={`/api/admin/archive/uploaded-files/${file.id}/download`} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]"><Download className="h-3.5 w-3.5" /> تنزيل</a>
                              <button type="button" onClick={() => void removeFile(file.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-rose-700 hover:border-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function fileCategoryOptions(category: Category) {
  return category === "MARKETING"
    ? ["خطط حملات", "تقارير نتائج", "ملفات مشاريع", "محتوى إعلاني", "ميزانيات"]
    : ["عقود", "تراخيص", "أوراق المؤسسة", "شراكات", "تقارير رسمية"];
}

function statusLabel(value: ReviewStatus) {
  return reviewStatuses.find((status) => status.value === value)?.label ?? "جديد";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatBytes(value: number) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
