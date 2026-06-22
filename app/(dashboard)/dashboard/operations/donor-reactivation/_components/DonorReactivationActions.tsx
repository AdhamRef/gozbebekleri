"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, MailCheck, PauseCircle, UserX } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import type { DonorReactivationActionType } from "@/lib/operations/donor-reactivation/donor-reactivation-types";

type ActionConfig = {
  action: DonorReactivationActionType;
  label: string;
  success: string;
  confirm: string;
  icon: typeof MailCheck;
  variant?: "default" | "outline" | "secondary";
  askNote?: boolean;
};

const actions: ActionConfig[] = [
  {
    action: "MARK_MANUALLY_SENT",
    label: "Mark manually sent",
    success: "تم تسجيل التواصل اليدوي",
    confirm: "تأكيد أن التواصل تم يدويًا خارج النظام؟ لن يتم إرسال أي رسالة من هنا.",
    icon: MailCheck,
    variant: "secondary",
  },
  {
    action: "ASSIGN_FOLLOW_UP_TASK",
    label: "Assign follow-up task",
    success: "تم إنشاء مهمة متابعة",
    confirm: "إنشاء مهمة متابعة داخل Operations بدون إرسال رسالة؟",
    icon: ClipboardList,
    variant: "secondary",
    askNote: true,
  },
  {
    action: "SKIP_THIS_MONTH",
    label: "Skip this month",
    success: "تم التخطي لهذا الشهر",
    confirm: "تخطي هذا المتبرع من قائمة التنشيط لهذا الشهر؟",
    icon: PauseCircle,
    variant: "outline",
  },
  {
    action: "DISMISS",
    label: "Dismiss",
    success: "تم استبعاد المتبرع من هذه القائمة",
    confirm: "استبعاد هذا المتبرع من القائمة الحالية؟",
    icon: UserX,
    variant: "outline",
  },
];

export function DonorReactivationActions({ donorId, canMutate }: { donorId: string; canMutate: boolean }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<DonorReactivationActionType | null>(null);
  const [createdTask, setCreatedTask] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  if (!canMutate) {
    return <p className="mt-3 rounded-xl border bg-slate-50 p-3 text-xs font-semibold text-slate-500">الأفعال اليدوية تتاح عند توفر قاعدة البيانات وصلاحية operations. لا يوجد إرسال تلقائي.</p>;
  }

  async function runAction(config: ActionConfig) {
    if (!window.confirm(config.confirm)) return;

    let note: string | undefined;
    if (config.askNote) {
      const value = window.prompt("ملاحظة مختصرة للمهمة؟", "متابعة ودية بدون ضغط على المتبرع.");
      if (value === null) return;
      note = value.trim() || undefined;
    }

    setPendingAction(config.action);

    try {
      const response = await fetch("/api/dashboard/operations/donor-reactivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorId, action: config.action, note }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشلت العملية");
      }

      toast.success(payload?.message || config.success);
      if (config.action === "ASSIGN_FOLLOW_UP_TASK") setCreatedTask(true);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشلت العملية");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      {actions.map((config) => {
        const Icon = config.icon;
        const isPending = pendingAction === config.action || isRefreshing;
        return (
          <Button
            key={config.action}
            type="button"
            size="sm"
            variant={config.variant ?? "secondary"}
            className={config.action === "DISMISS" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : undefined}
            disabled={Boolean(pendingAction) || isRefreshing}
            onClick={() => runAction(config)}
          >
            {isPending && pendingAction === config.action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {config.label}
          </Button>
        );
      })}
      {createdTask ? <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-[#025EB8] underline-offset-4 hover:underline">فتح مهام الفريق</Link> : null}
    </div>
  );
}
