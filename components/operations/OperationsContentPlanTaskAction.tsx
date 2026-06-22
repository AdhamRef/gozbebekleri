"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationsOverview } from "@/lib/operations/types";

type ContentPlan = OperationsOverview["plans"][number];

function priorityForPlan(plan: ContentPlan) {
  return plan.status === "ACTIVE" ? "HIGH" : "MEDIUM";
}

export function OperationsContentPlanTaskAction({ plan }: { plan: ContentPlan }) {
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
          title: `متابعة خطة المحتوى: ${plan.title}`,
          description: [
            "مهمة متابعة لخطة محتوى من Operations Content Board.",
            `الخطة: ${plan.title}`,
            `المحور: ${plan.theme}`,
            `الحالة: ${plan.status}`,
            `العناصر: ${plan.items}`,
            `المنشور: ${plan.published}`,
            `الفترة: ${plan.date}`,
            plan.id ? `Foundation plan id: ${plan.id}` : null,
          ].filter(Boolean).join(" "),
          taskType: "WRITING",
          priority: priorityForPlan(plan),
          sourceType: "CONTENT_PLAN",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل إنشاء مهمة الخطة");
      }

      setCreated(true);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشل إنشاء مهمة الخطة");
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
        {created ? "تم إنشاء مهمة" : "إنشاء مهمة متابعة"}
      </Button>
      {created ? <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-[#025EB8] underline-offset-4 hover:underline">فتح المهام</Link> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
