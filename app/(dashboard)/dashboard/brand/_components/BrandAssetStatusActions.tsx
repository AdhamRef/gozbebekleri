"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LockKeyhole, RotateCcw, UnlockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  assetId: string;
  status: string;
  downloadable: boolean;
  hasFileUrl: boolean;
};

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function BrandAssetStatusActions({ assetId, status, downloadable, hasFileUrl }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function updateAsset(action: string, payload: { status?: string; downloadable?: boolean; notes?: string }) {
    if (action === "activate" && !window.confirm("اعتماد أصل الهوية؟ سيتم اعتباره صالحًا للاستخدام الداخلي، بدون أي نشر أو تحميل تلقائي.")) return;
    setBusy(action);
    setFeedback(null);

    const response = await fetch("/api/admin/brand/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: assetId, ...payload }),
    });
    const result = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok || !result?.ok) {
      setFeedback({ tone: "error", message: result?.message || result?.error || "فشل تحديث أصل الهوية" });
      return;
    }

    setFeedback({ tone: "success", message: result?.message || "تم تحديث أصل الهوية" });
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2">
        {status !== "ACTIVE" ? (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null || !hasFileUrl} onClick={() => updateAsset("activate", { status: "ACTIVE", downloadable, notes: "Human verified Brand Asset. No automatic publish or external call." })} className="gap-2 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Activate verified
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => updateAsset("verify", { status: "TO_VERIFY", downloadable: false, notes: "Returned to verification. Public/internal use should pause until reviewed." })} className="gap-2 font-bold">
            <RotateCcw className="h-3.5 w-3.5" /> Back to verify
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={busy !== null || !hasFileUrl} onClick={() => updateAsset("downloadable", { downloadable: !downloadable, notes: downloadable ? "Download disabled manually." : "Download enabled manually after human review." })} className="gap-2 font-bold">
          {downloadable ? <LockKeyhole className="h-3.5 w-3.5" /> : <UnlockKeyhole className="h-3.5 w-3.5" />}
          {downloadable ? "Lock download" : "Allow download"}
        </Button>
      </div>
      {!hasFileUrl ? <p className="mt-2 text-xs font-semibold text-amber-700">لا يمكن الاعتماد أو السماح بالتحميل بدون File URL موثق.</p> : null}
      {busy ? <p className="mt-2 text-xs font-semibold text-slate-500">جاري التحديث...</p> : null}
      {feedback ? <p className={`mt-2 text-xs font-semibold ${feedback.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>{feedback.message}</p> : null}
    </div>
  );
}
