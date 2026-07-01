"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketingPerformanceRecord } from "@/lib/operations/marketing-performance/performance-types";

export function PerformanceRecordActions({ record }: { record: MarketingPerformanceRecord }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function removeRecord() {
    if (!window.confirm("هل تريد حذف سجل الأداء؟")) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/dashboard/operations/marketing-performance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "REMOVE", item: record }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !result?.ok) {
      setMessage(result?.message || "فشل حذف السجل");
      return;
    }
    setMessage("تم حذف السجل");
    router.refresh();
  }

  return <div className="mt-3 border-t pt-3"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={removeRecord} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /> حذف</Button>{message ? <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p> : null}</div>;
}
