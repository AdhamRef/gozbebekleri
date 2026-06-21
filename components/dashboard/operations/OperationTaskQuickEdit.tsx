"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PlanningActionPriority } from "@/lib/operations/planning/planning-types";

const objectIdPattern = /^[a-f\d]{24}$/i;

const priorities: { value: PlanningActionPriority; label: string }[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

function dueLabelToDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function dateToIsoOrNull(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
}

export function OperationTaskQuickEdit({
  taskId,
  title,
  priority,
  dueLabel,
  canMutate,
}: {
  taskId: string;
  title: string;
  priority: PlanningActionPriority;
  dueLabel: string;
  canMutate: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftPriority, setDraftPriority] = useState<PlanningActionPriority>(priority);
  const [draftDueDate, setDraftDueDate] = useState(dueLabelToDate(dueLabel));
  const [resultNotes, setResultNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const isRealTask = objectIdPattern.test(taskId);

  if (!canMutate || !isRealTask) return null;

  function reset() {
    setDraftTitle(title);
    setDraftPriority(priority);
    setDraftDueDate(dueLabelToDate(dueLabel));
    setResultNotes("");
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = draftTitle.trim();

    if (trimmedTitle.length < 2) {
      toast.error("عنوان المهمة قصير جدًا");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/operations/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          title: trimmedTitle,
          priority: draftPriority,
          dueAt: dateToIsoOrNull(draftDueDate),
          resultNotes: resultNotes.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل تحديث المهمة");
      }

      toast.success("تم تحديث المهمة");
      setIsEditing(false);
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل تحديث المهمة";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="mt-3">
        <Button type="button" size="sm" variant="ghost" className="text-slate-600" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4" />
          Quick edit
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-200 bg-white p-3" dir="rtl">
      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-1.5">
          <label htmlFor={`task-title-${taskId}`} className="text-xs font-bold text-slate-600">العنوان</label>
          <Input id={`task-title-${taskId}`} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={180} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">الأولوية</label>
          <Select value={draftPriority} onValueChange={(value) => setDraftPriority(value as PlanningActionPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {priorities.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`task-due-${taskId}`} className="text-xs font-bold text-slate-600">الموعد</label>
          <Input id={`task-due-${taskId}`} type="date" value={draftDueDate} onChange={(event) => setDraftDueDate(event.target.value)} />
        </div>

        <div className="space-y-1.5 md:col-span-3">
          <label htmlFor={`task-notes-${taskId}`} className="text-xs font-bold text-slate-600">ملاحظة تحديث</label>
          <Textarea
            id={`task-notes-${taskId}`}
            value={resultNotes}
            onChange={(event) => setResultNotes(event.target.value)}
            placeholder="اختياري: ماذا تغير؟"
            maxLength={2000}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting || isRefreshing}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isSubmitting || isRefreshing} onClick={reset}>
          <X className="h-4 w-4" />
          إلغاء
        </Button>
      </div>
    </form>
  );
}
