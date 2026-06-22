"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScheduledChannel } from "@/lib/operations/scheduler/scheduler-types";

type ManualStatus = "MANUALLY_SENT" | "CANCELLED";

const actionCopy: Record<ManualStatus, { label: string; success: string; confirm: string }> = {
  MANUALLY_SENT: {
    label: "Mark manually sent",
    success: "تم تسجيل الإرسال اليدوي",
    confirm: "تأكيد التسجيل؟ لن يتم إرسال أي رسالة أو نشر أي محتوى تلقائيًا.",
  },
  CANCELLED: {
    label: "Cancel",
    success: "تم تسجيل الإلغاء",
    confirm: "تأكيد إلغاء هذا العنصر المجدول؟ سيتم تسجيل الإلغاء فقط بدون أي اتصال خارجي.",
  },
};

export function SchedulerManualActions({
  itemId,
  title,
  channel,
  scheduledFor,
}: {
  itemId: string;
  title: string;
  channel: ScheduledChannel;
  scheduledFor: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<ManualStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  async function record(status: ManualStatus) {
    const copy = actionCopy[status];
    if (!window.confirm(copy.confirm)) return;

    setBusy(status);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/operations/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId: itemId,
          platform: channel,
          status,
          scheduledAt: scheduledFor,
          notes: `${copy.label} from Operations Scheduler for: ${title}. No automatic sending or publishing happened.`,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشلت العملية");
      }

      setMessage(copy.success);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشلت العملية");
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null || isRefreshing;

  return (
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" className="bg-slate-50 text-slate-700 hover:bg-slate-100" disabled={disabled} onClick={() => record("MANUALLY_SENT")}>
          {busy === "MANUALLY_SENT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Mark manually sent
        </Button>
        <Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={disabled} onClick={() => record("CANCELLED")}>
          {busy === "CANCELLED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Cancel
        </Button>
      </div>
      <p className="text-[11px] font-semibold leading-5 text-slate-500">هذه الأزرار تسجل حالة بشرية فقط؛ لا يوجد إرسال أو نشر تلقائي.</p>
      {message ? <p className="text-xs font-bold text-emerald-600">{message}</p> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
