"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanningActionPriority, PlanningActionType } from "@/lib/operations/planning/planning-types";

const objectIdPattern = /^[a-f\d]{24}$/i;

function dueLabelToIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;
}

export function PlanningActionTaskAction({
  actionId,
  seasonTitle,
  title,
  type,
  priority,
  suggestedOwner,
  dueLabel,
  quantity,
  reason,
}: {
  actionId: string;
  seasonTitle: string;
  title: string;
  type: PlanningActionType;
  priority: PlanningActionPriority;
  suggestedOwner: string;
  dueLabel: string;
  quantity: number;
  reason: string;
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
          title,
          description: `${reason} Season: ${seasonTitle}. Suggested owner: ${suggestedOwner}. Quantity: ${quantity}.`,
          taskType: type,
          priority,
          dueAt: dueLabelToIso(dueLabel),
          sourceType: "PLANNING_ACTION",
          sourceId: objectIdPattern.test(actionId) ? actionId : undefined,
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
        Create task
      </Button>
      {created ? <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-[#025EB8] underline-offset-4 hover:underline">فتح مهام التشغيل</Link> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
