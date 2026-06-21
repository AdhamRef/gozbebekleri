"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, ClipboardCheck, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import type { OperationsTaskStatus } from "@/lib/operations/tasks/task-types";

type TaskTransition = {
  status: OperationsTaskStatus;
  label: string;
  success: string;
  confirm?: string;
  requiresBlockReason?: boolean;
};

const objectIdPattern = /^[a-f\d]{24}$/i;

const transitionIcon = {
  IN_PROGRESS: Play,
  NEEDS_REVIEW: ClipboardCheck,
  DONE: CheckCircle2,
  BLOCKED: Ban,
  PENDING: RotateCcw,
} satisfies Partial<Record<OperationsTaskStatus, typeof Play>>;

function transitionsFor(status: OperationsTaskStatus): TaskTransition[] {
  if (status === "PENDING" || status === "DELAYED" || status === "MISSED") {
    return [
      { status: "IN_PROGRESS", label: "Start", success: "بدأ تنفيذ المهمة" },
      { status: "BLOCKED", label: "Block", success: "تم حجب المهمة", requiresBlockReason: true },
    ];
  }

  if (status === "IN_PROGRESS") {
    return [
      { status: "NEEDS_REVIEW", label: "Ready for review", success: "تم إرسال المهمة للمراجعة" },
      { status: "DONE", label: "Complete", success: "تم إكمال المهمة", confirm: "تأكيد إكمال هذه المهمة؟" },
      { status: "BLOCKED", label: "Block", success: "تم حجب المهمة", requiresBlockReason: true },
    ];
  }

  if (status === "NEEDS_REVIEW") {
    return [
      { status: "DONE", label: "Approve complete", success: "تم اعتماد اكتمال المهمة", confirm: "تأكيد اعتماد اكتمال هذه المهمة؟" },
      { status: "IN_PROGRESS", label: "Return to progress", success: "تمت إعادة المهمة للتنفيذ" },
      { status: "BLOCKED", label: "Block", success: "تم حجب المهمة", requiresBlockReason: true },
    ];
  }

  if (status === "BLOCKED") {
    return [
      { status: "IN_PROGRESS", label: "Resume", success: "تم استئناف المهمة" },
      { status: "PENDING", label: "Back to pending", success: "تمت إعادة المهمة للانتظار" },
    ];
  }

  return [];
}

export function OperationTaskActions({
  taskId,
  status,
  canMutate,
}: {
  taskId: string;
  status: OperationsTaskStatus;
  canMutate: boolean;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<OperationsTaskStatus | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const actions = transitionsFor(status);
  const isRealTask = objectIdPattern.test(taskId);
  const disabled = pendingStatus !== null || isRefreshing;

  if (actions.length === 0) {
    return <p className="text-xs font-medium text-slate-500">لا توجد أفعال مطلوبة لهذه الحالة.</p>;
  }

  if (!canMutate || !isRealTask) {
    return <p className="text-xs font-medium text-slate-500">الأفعال متاحة بعد وجود مهام OperationTask فعلية في قاعدة البيانات.</p>;
  }

  async function runTransition(action: TaskTransition) {
    if (action.confirm && !window.confirm(action.confirm)) return;

    let blockedReason: string | undefined;
    if (action.requiresBlockReason) {
      const reason = window.prompt("سبب الحجب أو ما الذي يمنع إكمال المهمة؟", "");
      if (reason === null) return;
      blockedReason = reason.trim() || "Blocked manually from operations task board.";
    }

    setPendingStatus(action.status);

    try {
      const response = await fetch("/api/dashboard/operations/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: action.status,
          blockedReason,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشلت العملية");
      }

      toast.success(action.success);
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشلت العملية";
      toast.error(message);
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
      {actions.map((action) => {
        const Icon = transitionIcon[action.status] ?? CheckCircle2;
        const isPending = pendingStatus === action.status;
        return (
          <Button
            key={action.status}
            type="button"
            size="sm"
            variant={action.status === "BLOCKED" ? "outline" : "secondary"}
            className={action.status === "BLOCKED" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "bg-white text-slate-700 hover:bg-slate-100"}
            disabled={disabled}
            onClick={() => runTransition(action)}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
