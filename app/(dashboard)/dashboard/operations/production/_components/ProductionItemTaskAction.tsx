"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import type { PlanningActionPriority, PlanningActionType } from "@/lib/operations/planning/planning-types";
import type { ProductionStage } from "@/lib/operations/production/production-types";

const objectIdPattern = /^[a-f\d]{24}$/i;

const taskTypeByStage: Record<ProductionStage, PlanningActionType> = {
  IDEA: "WRITING",
  SCRIPT: "WRITING",
  DESIGN: "DESIGN",
  VIDEO: "VIDEO",
  REVIEW: "DESIGN",
  READY: "MESSAGING",
  PUBLISHED: "MESSAGING",
};

function dueLabelToIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;
}

export function ProductionItemTaskAction({
  itemId,
  title,
  stage,
  priority,
  owner,
  dueLabel,
}: {
  itemId: string;
  title: string;
  stage: ProductionStage;
  priority: PlanningActionPriority;
  owner: string;
  dueLabel: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  async function createTask() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/operations/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Production follow-up: ${title}`,
          description: `Created from Production Board. Stage: ${stage}. Owner: ${owner}. Due: ${dueLabel}.`,
          taskType: taskTypeByStage[stage],
          priority,
          dueAt: dueLabelToIso(dueLabel),
          sourceType: "PRODUCTION_BOARD",
          sourceId: objectIdPattern.test(itemId) ? itemId : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل إنشاء المهمة");
      }

      setCreatedTaskId(payload.task?.id ?? "created");
      toast.success("تم إنشاء مهمة من عنصر الإنتاج");
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل إنشاء المهمة";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="bg-slate-50 text-slate-700 hover:bg-slate-100"
        disabled={isSubmitting || isRefreshing}
        onClick={createTask}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        إنشاء مهمة
      </Button>
      {createdTaskId ? (
        <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-brand underline-offset-4 hover:underline">
          فتح مهام التشغيل
        </Link>
      ) : null}
    </div>
  );
}
