"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

type Props = {
  assetId: string;
  fileName: string;
};

export function ArchiveAssetTaskAction({ assetId, fileName }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function assignTask() {
    if (saving) return;
    const confirmed = window.confirm(`إنشاء مهمة للفريق لهذه المادة: ${fileName}؟`);
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);

    const response = await fetch(`/api/admin/archive/assets/${encodeURIComponent(assetId)}/assign-task`, {
      method: "POST",
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "تعذر إنشاء المهمة" });
      return;
    }

    setFeedback({ tone: "success", message: result?.message || "تم إنشاء مهمة للفريق" });
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={assignTask} className="gap-2 font-bold">
          <ClipboardList className="h-4 w-4" /> {saving ? "جاري إنشاء المهمة" : "إنشاء مهمة"}
        </Button>
        {feedback?.tone === "success" ? (
          <Link href="/dashboard/operations/tasks" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
            فتح مهام الفريق <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">تُستخدم المهمة لتنظيم مراجعة أو تجهيز المادة داخل الفريق.</p>
      {feedback ? (
        <p className={`mt-2 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
