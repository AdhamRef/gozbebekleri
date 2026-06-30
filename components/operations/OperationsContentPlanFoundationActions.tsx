import type { OperationsOverview } from "@/lib/operations/types";
import { OperationsFoundationItemActions } from "./OperationsFoundationItemActions";

const planStatusOptions = [
  ["PLANNING", "تخطيط"],
  ["ACTIVE", "نشط"],
  ["DONE", "منتهي"],
] as const;

const planFields = [
  { key: "title", label: "اسم الخطة" },
  { key: "theme", label: "المحور" },
  { key: "status", label: "الحالة", type: "select", options: planStatusOptions },
  { key: "items", label: "عدد العناصر", type: "number" },
  { key: "published", label: "المنجز", type: "number" },
  { key: "date", label: "الفترة" },
] as const;

export function OperationsContentPlanFoundationActions({ plan }: { plan: OperationsOverview["plans"][number] }) {
  return <OperationsFoundationItemActions collection="plans" item={plan} fields={planFields} />;
}
