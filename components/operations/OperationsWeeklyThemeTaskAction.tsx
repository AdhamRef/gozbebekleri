"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationsOverview } from "@/lib/operations/types";

type WeeklyTheme = OperationsOverview["weeklyThemes"][number];

export function OperationsWeeklyThemeTaskAction({ theme }: { theme: WeeklyTheme }) {
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
          title: `تحويل محور أسبوعي إلى محتوى: ${theme.theme}`,
          description: [
            "مهمة متابعة لمحور أسبوعي من خطة المحاور الشهرية في Operations Content Board.",
            `الأسبوع: ${theme.week}`,
            `المحور: ${theme.theme}`,
            `الوصف: ${theme.description}`,
            theme.id ? `Foundation weekly theme id: ${theme.id}` : null,
          ].filter(Boolean).join(" "),
          taskType: "WRITING",
          priority: "MEDIUM",
          sourceType: "OPERATION_WEEKLY_THEME",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل إنشاء مهمة المحور");
      }

      setCreated(true);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشل إنشاء مهمة المحور");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="bg-white text-slate-700 hover:bg-slate-100"
        disabled={isSubmitting || isRefreshing || created}
        onClick={createTask}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        {created ? "تم إنشاء مهمة" : "إنشاء مهمة محور"}
      </Button>
      {created ? <Link href="/dashboard/operations/tasks" className="text-xs font-bold text-brand underline-offset-4 hover:underline">فتح المهام</Link> : null}
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  );
}
