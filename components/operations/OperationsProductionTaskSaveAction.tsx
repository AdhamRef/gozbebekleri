"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationsOverview } from "@/lib/operations/types";

type OperationTaskType = "WRITING" | "DESIGN" | "VIDEO" | "CAROUSEL" | "MESSAGING";

type ProductionTask = OperationsOverview["tasks"][number];

function inferTaskType(task: ProductionTask): OperationTaskType {
  const text = `${task.title} ${task.item}`.toLowerCase();
  if (text.includes("واتساب") || text.includes("sms") || text.includes("email")) return "MESSAGING";
  if (text.includes("فيديو") || text.includes("مونتاج") || text.includes("reel")) return "VIDEO";
  if (text.includes("كاروسيل") || text.includes("carousel")) return "CAROUSEL";
  if (text.includes("تصميم") || text.includes("design")) return "DESIGN";
  return "WRITING";
}

export function OperationsProductionTaskSaveAction({ task }: { task: ProductionTask }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  async function createTask() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/operations/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: [
            "مهمة إنتاج محفوظة من لوحة المحتوى.",
            `مرتبطة بـ: ${task.item}`,
            `المسؤول المقترح: ${task.owner}`,
            `موعد التسليم: ${task.due}`,
            task.id ? `Foundation task id: ${task.id}` : null,
          ].filter(Boolean).join(" "),
          taskType: inferTaskType(task),
          priority: "MEDIUM",
          sourceType: "CONTENT_PRODUCTION_TASK",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل حفظ المهمة");
      }

      setCreated(true);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشل حفظ المهمة");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="bg-white text-slate-700 hover:bg-slate-100"
        disabled={isSubmitting || isRefreshing || created}
        onClick={createTask}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        {created ? "تم الحفظ" : "حفظ كمهمة فعلية"}
      </Button>
      {created ? <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-[#025EB8] underline-offset-4 hover:underline">فتح مهام التشغيل</Link> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
