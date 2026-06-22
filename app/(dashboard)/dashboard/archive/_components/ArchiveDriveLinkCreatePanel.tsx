"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, FolderPlus, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArchiveProject } from "@/lib/archive/archive-types";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

type DriveUrlPreview = {
  valid: boolean;
  type: "FOLDER" | "FILE" | "UNKNOWN";
  id: string | null;
  message: string;
};

type Props = {
  projects: ArchiveProject[];
};

function previewDriveUrl(value: string): DriveUrlPreview {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, type: "UNKNOWN", id: null, message: "أدخل رابط Google Drive للمعاينة قبل الحفظ." };
  }

  try {
    const url = new URL(trimmed);
    const isGoogleDrive = url.hostname === "drive.google.com" || url.hostname.endsWith(".drive.google.com");
    if (!isGoogleDrive) {
      return { valid: false, type: "UNKNOWN", id: null, message: "الرابط يجب أن يكون من Google Drive فقط." };
    }

    const folderId = url.pathname.match(/\/folders\/([^/?#]+)/)?.[1] ?? null;
    const fileId = url.pathname.match(/\/file\/d\/([^/?#]+)/)?.[1] ?? url.searchParams.get("id");

    if (folderId) {
      return { valid: true, type: "FOLDER", id: folderId, message: "تم التعرف على Google Drive Folder. سيتم حفظ البيانات فقط بدون مزامنة خارجية." };
    }

    if (fileId) {
      return { valid: true, type: "FILE", id: fileId, message: "تم التعرف على Google Drive File. سيتم حفظ البيانات فقط بدون تنزيل الملف." };
    }

    return { valid: true, type: "UNKNOWN", id: null, message: "رابط Google Drive صحيح، لكن لم يتم التعرف على Folder/File ID تلقائيًا." };
  } catch {
    return { valid: false, type: "UNKNOWN", id: null, message: "صيغة الرابط غير صحيحة. استخدم رابطًا كاملًا من Google Drive." };
  }
}

export function ArchiveDriveLinkCreatePanel({ projects }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const projectOptions = useMemo(() => projects.map((project) => ({ id: project.id, label: `${project.title} / ${project.year}` })), [projects]);
  const drivePreview = useMemo(() => previewDriveUrl(driveUrl), [driveUrl]);

  async function submitDriveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!projectId || !title.trim() || !driveUrl.trim()) {
      setFeedback({ tone: "error", message: "أكمل المشروع، العنوان، ورابط Google Drive أولًا." });
      return;
    }

    if (!drivePreview.valid) {
      setFeedback({ tone: "error", message: drivePreview.message });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const response = await fetch("/api/admin/archive/drive-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title: title.trim(), driveUrl: driveUrl.trim() }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "فشل حفظ رابط Drive" });
      return;
    }

    setTitle("");
    setDriveUrl("");
    setFeedback({ tone: "success", message: result?.message || "تم حفظ رابط Drive بدون أي اتصال خارجي." });
    router.refresh();
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-white p-5 text-sm leading-6 text-slate-600">
        <div className="flex items-center gap-2 font-black text-slate-950">
          <FolderPlus className="h-4 w-4 text-[#025EB8]" /> Add Drive Link
        </div>
        <p className="mt-2">أنشئ Archive Project أولًا قبل ربط Google Drive. لا توجد مزامنة أو تحليل تلقائي في هذه المرحلة.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submitDriveLink} className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-slate-950">
            <FolderPlus className="h-4 w-4 text-[#025EB8]" /> Add Google Drive Link
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">يحفظ الرابط ويستخرج Folder/File ID فقط. لا يتم اختبار Google Drive أو تنزيل ملفات تلقائيًا.</p>
        </div>
        <Button type="submit" size="sm" disabled={saving || !drivePreview.valid} className="gap-2 font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "جاري الحفظ" : "Save Link"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1fr_1.6fr]">
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Project
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]">
            {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: Gaza 2025 field folder" className="h-10 rounded-md border bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Drive URL
          <input dir="ltr" value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="h-10 rounded-md border bg-white px-3 text-left font-mono text-sm text-slate-900 outline-none focus:border-[#025EB8]" />
        </label>
      </div>

      <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold leading-5 ${drivePreview.valid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
        <div className="flex items-center gap-2">
          {drivePreview.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{drivePreview.message}</span>
        </div>
        {drivePreview.id ? (
          <div dir="ltr" className="mt-1 flex items-center gap-2 truncate font-mono text-[11px]">
            {drivePreview.type === "FOLDER" ? <FolderPlus className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            {drivePreview.type}: {drivePreview.id}
          </div>
        ) : null}
      </div>

      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">Provider source: MarketingPlatformConnection / provider catalog. External Drive access stays disabled until provider-backed sync is intentionally implemented.</p>
      {feedback ? (
        <p className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
