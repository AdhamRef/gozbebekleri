"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublicationStatus = "READY_FOR_MANUAL_SEND" | "PUBLISHED" | "FAILED" | "CANCELLED";

const actionCopy: Record<PublicationStatus, { label: string; success: string; confirm: string }> = {
  READY_FOR_MANUAL_SEND: {
    label: "Queue manual publish",
    success: "تم وضع المنصة في طابور النشر اليدوي",
    confirm: "سيتم تسجيل المنصة كجاهزة للنشر اليدوي فقط. لن يتم نشر أي شيء تلقائيًا.",
  },
  PUBLISHED: {
    label: "Mark published",
    success: "تم تسجيل النشر اليدوي",
    confirm: "تأكيد تسجيل النشر اليدوي؟ لن يتم الاتصال بأي منصة خارجية.",
  },
  FAILED: {
    label: "Mark failed",
    success: "تم تسجيل فشل النشر للمراجعة",
    confirm: "تأكيد تسجيل فشل النشر؟ سيتم حفظ الحالة فقط بدون أي محاولة إعادة نشر.",
  },
  CANCELLED: {
    label: "Cancel",
    success: "تم تسجيل الإلغاء",
    confirm: "تأكيد إلغاء هذا النشر اليدوي؟ لن يتم حذف أي بيانات.",
  },
};

export function PublishingManualActions({
  contentItemId,
  title,
  platform,
}: {
  contentItemId: string;
  title: string;
  platform: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<PublicationStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  async function record(status: PublicationStatus) {
    const copy = actionCopy[status];
    if (!window.confirm(copy.confirm)) return;

    let publishedUrl = "";
    if (status === "PUBLISHED") {
      publishedUrl = window.prompt("رابط النشر إن وجد. اتركه فارغًا لو لم يتوفر.", "")?.trim() ?? "";
    }

    setBusy(status);
    setMessage(null);
    setError(null);

    try {
      const body: Record<string, string> = {
        contentItemId,
        platform,
        status,
        publishedAt: new Date().toISOString(),
        notes: `${copy.label} from Operations Publishing for ${title} on ${platform}. No automatic sending or publishing happened.`,
      };
      if (publishedUrl) body.publishedUrl = publishedUrl;

      const response = await fetch("/api/dashboard/operations/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="border-blue-200 text-brand hover:bg-blue-50" disabled={disabled} onClick={() => record("READY_FOR_MANUAL_SEND")}>
          {busy === "READY_FOR_MANUAL_SEND" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Queue
        </Button>
        <Button type="button" size="sm" variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100" disabled={disabled} onClick={() => record("PUBLISHED")}>
          {busy === "PUBLISHED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Published
        </Button>
        <Button type="button" size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" disabled={disabled} onClick={() => record("FAILED")}>
          {busy === "FAILED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Failed
        </Button>
        <Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={disabled} onClick={() => record("CANCELLED")}>
          {busy === "CANCELLED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Cancel
        </Button>
      </div>
      {message ? <p className="text-xs font-bold text-emerald-600">{message}</p> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
