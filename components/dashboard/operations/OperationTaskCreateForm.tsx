"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PlanningActionPriority, PlanningActionType } from "@/lib/operations/planning/planning-types";

const taskTypes: { value: PlanningActionType; label: string }[] = [
  { value: "WRITING", label: "Writing" },
  { value: "DESIGN", label: "Design" },
  { value: "VIDEO", label: "Video" },
  { value: "CAROUSEL", label: "Carousel" },
  { value: "MESSAGING", label: "Messaging" },
];

const priorities: { value: PlanningActionPriority; label: string }[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

function dateToIso(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;
}

export function OperationTaskCreateForm({ isFoundationMode }: { isFoundationMode: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<PlanningActionType>("WRITING");
  const [priority, setPriority] = useState<PlanningActionPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 2) {
      toast.error("اكتب عنوانًا واضحًا للمهمة");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/operations/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          taskType,
          priority,
          dueAt: dateToIso(dueDate),
          sourceType: "MANUAL",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "فشل إنشاء المهمة");
      }

      toast.success("تم إنشاء المهمة");
      setTitle("");
      setDescription("");
      setTaskType("WRITING");
      setPriority("MEDIUM");
      setDueDate("");
      startTransition(() => router.refresh());
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل إنشاء المهمة";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" dir="rtl">
      <div className="space-y-1.5 lg:col-span-2">
        <label htmlFor="operation-task-title" className="text-xs font-bold text-slate-600">عنوان المهمة</label>
        <Input
          id="operation-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="مثال: مراجعة تصميم حملة الجمعة"
          maxLength={180}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600">النوع</label>
        <Select value={taskType} onValueChange={(value) => setTaskType(value as PlanningActionType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {taskTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600">الأولوية</label>
        <Select value={priority} onValueChange={(value) => setPriority(value as PlanningActionPriority)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {priorities.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="operation-task-due" className="text-xs font-bold text-slate-600">الموعد</label>
        <Input id="operation-task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </div>

      <div className="space-y-1.5 lg:col-span-4">
        <label htmlFor="operation-task-description" className="text-xs font-bold text-slate-600">ملاحظات مختصرة</label>
        <Textarea
          id="operation-task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="ما المطلوب؟ من أين يبدأ الفريق؟"
          maxLength={2000}
          className="min-h-20"
        />
        {isFoundationMode ? (
          <p className="text-xs leading-5 text-amber-700">القائمة الحالية foundation fallback. سيحاول النموذج إنشاء OperationTask حقيقية، وإن لم تكن قاعدة البيانات متاحة سيظهر فشل آمن.</p>
        ) : null}
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={isSubmitting || isRefreshing} className="w-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          إنشاء
        </Button>
      </div>
    </form>
  );
}
