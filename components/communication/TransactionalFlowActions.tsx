"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { TransactionalFlow } from "@/lib/communication/communication-types";

export function TransactionalFlowActions({ flow }: { flow: TransactionalFlow }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(operation: "SAVE" | "REMOVE", item: TransactionalFlow) {
    setIsBusy(true);
    setError(null);
    const response = await fetch("/api/dashboard/operations/communication/flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, item }),
    });
    const payload = await response.json().catch(() => null);
    setIsBusy(false);
    if (!response.ok) {
      setError(payload?.message || payload?.error || "تعذر تحديث التدفق.");
      return;
    }
    router.refresh();
  }

  return <div className="mt-3 flex flex-wrap gap-2">
    <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => submit("SAVE", { ...flow, status: flow.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>{flow.status === "ACTIVE" ? "إيقاف مؤقت" : "تفعيل داخلي"}</Button>
    <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => submit("SAVE", { ...flow, status: "DRAFT" })}>إرجاع كمسودة</Button>
    <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={() => submit("REMOVE", flow)}>حذف</Button>
    {error ? <p className="w-full text-xs font-semibold text-red-600">{error}</p> : null}
  </div>;
}
