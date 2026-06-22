"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, Radar, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionName = "test" | "sync";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
  mode?: string;
  externalCall?: boolean;
  readyForProviderTest?: boolean;
  safety?: {
    downloadedFiles?: boolean;
    analyzedFiles?: boolean;
    externalDriveCall?: boolean;
  };
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
      const confirmed = window.confirm("تشغيل فحص المزامنة الآمن؟ هذا ليس Google Drive sync حقيقيًا: لا تنزيل ملفات، لا تحليل صور، ولا اتصال خارجي.");
      if (!confirmed) return;
    }

    setRunning(action);
    setFeedback(null);

    const endpoint = action === "test"
      ? `/api/admin/archive/drive-links/${encodeURIComponent(linkId)}/test-access`
      : `/api/admin/archive/drive-links/${encodeURIComponent(linkId)}/sync`;

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setFeedback({
          tone: "error",
          message: result?.error || result?.message || "فشلت العملية الآمنة",
          mode: result?.mode,
          externalCall: result?.externalCall,
        });
        return;
      }

      setFeedback({
        tone: "success",
        message: result?.message || "تم تنفيذ الفحص الآمن",
        mode: result?.mode,
        externalCall: result?.externalCall,
        readyForProviderTest: Boolean(result?.data?.readyForProviderTest),
        safety: result?.safety,
      });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", message: "تعذر تنفيذ الفحص الآمن. راجع الاتصال أو الصلاحيات." });
    } finally {
      setRunning(null);
    }
  }

  const isTesting = running === "test";
  const isSyncing = running === "sync";

  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">Drive contract actions</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">تشخيص جاهزية فقط؛ ليس مزامنة فعلية ولا وصول خارجي إلى Google Drive.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SafetyBadge icon="lock" text="No external call" />
          <SafetyBadge icon="shield" text="No download" />
          <SafetyBadge icon="shield" text="No AI" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={Boolean(running)} onClick={() => runAction("test")} className="gap-2 font-bold">
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          Test readiness
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={Boolean(running)} onClick={() => runAction("sync")} className="gap-2 font-bold">
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Simulate sync contract
        </Button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ContractState label="Provider test" value="Contract only" />
        <ContractState label="Metadata sync" value="Skipped safely" />
        <ContractState label="Runtime model" value="Pending schema" />
      </div>

      {feedback ? (
        <div className={`mt-3 rounded-md border p-3 text-xs font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <div className="flex items-start gap-2">
            {feedback.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <p>{feedback.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {feedback.mode ? <MiniBadge>Mode: {feedback.mode}</MiniBadge> : null}
                {typeof feedback.externalCall === "boolean" ? <MiniBadge>External call: {String(feedback.externalCall)}</MiniBadge> : null}
                {typeof feedback.readyForProviderTest === "boolean" ? <MiniBadge>Ready: {String(feedback.readyForProviderTest)}</MiniBadge> : null}
                {feedback.safety?.downloadedFiles === false ? <MiniBadge>No files downloaded</MiniBadge> : null}
                {feedback.safety?.analyzedFiles === false ? <MiniBadge>No AI analysis</MiniBadge> : null}
                {feedback.safety?.externalDriveCall === false ? <MiniBadge>No Drive call</MiniBadge> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SafetyBadge({ icon, text }: { icon: "lock" | "shield"; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-black text-slate-600">
      {icon === "lock" ? <LockKeyhole className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      {text}
    </span>
  );
}

function ContractState({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-black text-slate-700">{value}</p>
    </div>
  );
}

function MiniBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-white/70 px-2 py-0.5 text-[11px] font-black">{children}</span>;
}
