"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Radar, RefreshCw, XCircle } from "lucide-react";
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

    setRunning(action);
    setFeedback(null);

    const endpoint = action === "test"
      ? `/api/admin/archive/drive-links/${encodeURIComponent(linkId)}/test-access`
      : `/api/admin/archive/drive-links/${encodeURIComponent(linkId)}/sync`;

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setFeedback({ tone: "error", message: result?.message || result?.error || "Action failed" });
        return;
      }

      setFeedback({ tone: "success", message: result?.message || "Updated" });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", message: "Action failed" });
    } finally {
      setRunning(null);
    }
  }

  const isTesting = running === "test";
  const isSyncing = running === "sync";

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={Boolean(running)} onClick={() => runAction("test")} className="gap-2 font-bold">
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          Check
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={Boolean(running)} onClick={() => runAction("sync")} className="gap-2 font-bold">
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {feedback ? (
        <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <div className="flex items-center gap-2">
            {feedback.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
