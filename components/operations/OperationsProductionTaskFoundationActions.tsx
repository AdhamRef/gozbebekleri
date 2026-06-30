import type { OperationsOverview } from "@/lib/operations/types";
import { OperationsFoundationItemActions } from "./OperationsFoundationItemActions";

const taskStatusOptions = [
  ["IDEA", "فكرة"],
  ["WRITING", "كتابة"],
  ["DESIGN", "تصميم"],
  ["IN_PROGRESS", "قيد التنفيذ"],
  ["REVIEW", "مراجعة"],
  ["APPROVED", "معتمد"],
  ["SCHEDULED", "مجدول"],
  ["PUBLISHED", "منشور"],
] as const;

const taskFields = [
  { key: "title", label: "المهمة" },
  { key: "item", label: "مرتبطة بـ" },
  { key: "owner", label: "المسؤول" },
  { key: "status", label: "الحالة", type: "select", options: taskStatusOptions },
  { key: "due", label: "موعد التسليم" },
] as const;

export function OperationsProductionTaskFoundationActions({ task }: { task: OperationsOverview["tasks"][number] }) {
  return <OperationsFoundationItemActions collection="tasks" item={task} fields={taskFields} />;
}
