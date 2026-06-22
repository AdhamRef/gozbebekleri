"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Radar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionName = "test" | "sync";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

type Props = {
  linkId: string;
};

export function ArchiveDriveLinkActions({ linkId }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<ActionName | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function runAction(action: ActionName) {
    if (running) return;
    if (action === "sync") {
      const confirmed = window.confirm("تشغيل فحص المزامنة الآمن؟ لن يتم تنزيل ملفات أو تحليل صور، وسيبقى التنفيذ Foundation إذا لم يوجد provider مفعّل.");
      if (!confirmed) return;
    }

    setRunning(action);
    setFeedback(null);

    const endpoint = action === "test"
      ? `/api/admin/archive/drive-links/${encodeURIComponent(linkId)}/test-access`
      : `/api/admin/archive/drive-links/${encodeURIComponent(linkId)}/sync`;

    const response = await fetch(endpoint, { method: "POST" });
    const result = await response.json().catch(() => null);
    setRunning(null);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.error || result?.message || "فشلت العملية" });
      return;
    }

    setFeedback({ tone: "success", message: result?.message || "تم تنفيذ العملية الآمنة" });
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={Boolean(running)} onClick={() => runAction("test")} className="gap-2 font-bold">
          {running === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          Test access contract
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={Boolean(running)} onClick={() => runAction("sync")} className="gap-2 font-bold">
          {running === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync metadata contract
        </Button>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">قراءة تشخيصية فقط. لا Google Drive call، لا تنزيل ملفات، ولا تحليل AI تلقائي.</p>
      {feedback ? (
        <p className={`mt-2 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
