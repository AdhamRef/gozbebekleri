"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MessagingCampaign, MessagingTemplate } from "@/lib/operations/messaging/messaging-types";

type Kind = "template" | "campaign";
type Item = MessagingTemplate | MessagingCampaign;

type Props = {
  kind: Kind;
  item: Item;
};

export function MessagingItemActions({ kind, item }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function patch(payloadItem: Record<string, unknown>, operation: "SAVE" | "REMOVE", success: string) {
    setBusy(operation);
    setMessage(null);
    const response = await fetch("/api/dashboard/operations/messaging", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, operation, item: payloadItem }),
    });
    const result = await response.json().catch(() => null);
    setBusy(null);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || "فشل تحديث عنصر الرسائل");
      return;
    }
    setMessage(success);
    router.refresh();
  }

  async function removeItem() {
    if (!window.confirm("هل تريد حذف هذا العنصر من مركز الرسائل؟")) return;
    await patch(item as unknown as Record<string, unknown>, "REMOVE", "تم حذف العنصر");
  }

  async function approveItem() {
    const next = kind === "template" ? { ...item, status: "APPROVED" } : { ...item, status: "APPROVED" };
    await patch(next as Record<string, unknown>, "SAVE", "تم الاعتماد داخليًا");
  }

  async function markManualDone() {
    if (kind !== "campaign") return;
    const next = { ...item, status: "MANUAL_SENT", lastManualStatus: "تم التسجيل يدويًا", lastManualAt: new Date().toISOString() };
    await patch(next as Record<string, unknown>, "SAVE", "تم تسجيل التنفيذ اليدوي فقط");
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={approveItem}>
        <Save className="h-3.5 w-3.5" /> اعتماد داخلي
      </Button>
      {kind === "campaign" ? (
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={markManualDone}>
          تسجيل تنفيذ يدوي
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={removeItem} className="text-rose-600 hover:text-rose-700">
        <Trash2 className="h-3.5 w-3.5" /> حذف
      </Button>
      {message ? <p className="w-full text-xs font-semibold text-slate-500">{message}</p> : null}
    </div>
  );
}
