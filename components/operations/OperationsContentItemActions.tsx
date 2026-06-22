"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, CheckCircle2, ClipboardCheck, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type OperationsContentItemActionsProps = {
  id?: string;
  status: string;
};

export function OperationsContentItemActions({ id, status }: OperationsContentItemActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!id?.startsWith("content_item_")) return null;

  async function updateStatus(nextStatus: string) {
    if (!id) return;
    if (nextStatus === "PUBLISHED" && !window.confirm("تأكيد نشر يدوي؟ لن يتم إرسال أو نشر أي محتوى تلقائيًا؛ سيتم تحديث حالة العنصر فقط.")) {
      return;
    }

    setBusy(nextStatus);
    setError(null);

    const response = await fetch("/api/dashboard/operations/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    const result = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "فشل تحديث عنصر المحتوى");
      return;
    }

    router.refresh();
  }

  const isPublished = status === "PUBLISHED";

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        {status !== "REVIEW" && !isPublished ? (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("REVIEW")}>
            <ClipboardCheck className="h-3.5 w-3.5" /> مراجعة
          </Button>
        ) : null}
        {status !== "APPROVED" && !isPublished ? (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("APPROVED")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> اعتماد
          </Button>
        ) : null}
        {status !== "SCHEDULED" && !isPublished ? (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("SCHEDULED")}>
            <CalendarCheck2 className="h-3.5 w-3.5" /> جدولة
          </Button>
        ) : null}
        {!isPublished ? (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("PUBLISHED")}>
            <Megaphone className="h-3.5 w-3.5" /> نشر يدوي
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] font-semibold leading-5 text-slate-500">النشر اليدوي يحدّث الحالة فقط؛ لا يوجد إرسال أو نشر تلقائي.</p>
      {busy ? <p className="text-xs font-semibold text-slate-500">جاري التحديث...</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}