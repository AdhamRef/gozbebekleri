"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
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

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        {status !== "REVIEW" ? (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("REVIEW")}>
            <ClipboardCheck className="h-3.5 w-3.5" /> مراجعة
          </Button>
        ) : null}
        {status !== "APPROVED" ? (
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => updateStatus("APPROVED")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> اعتماد
          </Button>
        ) : null}
      </div>
      {busy ? <p className="text-xs font-semibold text-slate-500">جاري التحديث...</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
