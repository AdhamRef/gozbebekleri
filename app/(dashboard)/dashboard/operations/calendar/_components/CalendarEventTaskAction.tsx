"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarEventCategory = "RELIGIOUS" | "CAMPAIGN" | "CONTENT" | "OPERATIONS";
type CalendarEventPriority = "HIGH" | "MEDIUM" | "LOW";
type OperationTaskType = "WRITING" | "DESIGN" | "VIDEO" | "CAROUSEL" | "MESSAGING";

const taskTypeByCategory: Record<CalendarEventCategory, OperationTaskType> = {
  RELIGIOUS: "WRITING",
  CAMPAIGN: "MESSAGING",
  CONTENT: "DESIGN",
  OPERATIONS: "WRITING",
};

export function CalendarEventTaskAction({
  eventId,
  title,
  category,
  dateLabel,
  hijriLabel,
  leadTimeDays,
  priority,
  focus,
  requiredAssets,
}: {
  eventId: string;
  title: string;
  category: CalendarEventCategory;
  dateLabel: string;
  hijriLabel?: string;
  leadTimeDays: number;
  priority: CalendarEventPriority;
  focus: string;
  requiredAssets: string[];
}) {
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
          title: `تجهيز ${title}`,
          description: [
            `مناسبة التقويم: ${title}`,
            `المعرف الداخلي: ${eventId}`,
            `التصنيف: ${category}`,
            `التاريخ: ${dateLabel}`,
            hijriLabel ? `التاريخ الهجري: ${hijriLabel}` : null,
            `زمن التحضير: ${leadTimeDays} يوم`,
            `التركيز: ${focus}`,
            `المواد المطلوبة: ${requiredAssets.join(", ")}`,
          ].filter(Boolean).join(". "),
          taskType: taskTypeByCategory[category],
          priority,
          sourceType: "CALENDAR_EVENT",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل إنشاء المهمة");
      }

      setCreated(true);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشل إنشاء المهمة");
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
        disabled={isSubmitting || isRefreshing}
        onClick={createTask}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        إنشاء مهمة
      </Button>
      {created ? <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-[#025EB8] underline-offset-4 hover:underline">تم إنشاء المهمة - فتح المهام</Link> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
