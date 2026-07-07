import Link from "next/link";
import { ArrowLeft, Archive, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperationsContentWorkspace } from "@/components/operations/OperationsContentWorkspace";
import { OperationsInfoCards } from "@/components/operations/OperationsInfoCards";
import { OperationsKpis } from "@/components/operations/OperationsKpis";
import { OperationsProductionTasks } from "@/components/operations/OperationsProductionTasks";
import { OperationsSeasonsBoard } from "@/components/operations/OperationsSeasonsBoard";
import { getOperationsOverview } from "@/lib/operations/service";
import { ContentItemCreatePanel } from "./_components/ContentItemCreatePanel";

const boardColumns = [
  ["IDEA", "أفكار", "مواد تحتاج اعتماد الفكرة"],
  ["WRITING", "كتابة", "النصوص والسكريبتات"],
  ["DESIGN", "تصميم", "تصاميم وفيديوهات قيد الإنتاج"],
  ["REVIEW", "مراجعة", "جاهز للمراجعة النهائية"],
  ["APPROVED", "معتمد", "جاهز للنشر أو التسويق"],
  ["SCHEDULED", "مجدول", "مواد لها موعد نشر يدوي"],
  ["PUBLISHED", "منشور يدويًا", "تم تسجيل نشرها بدون إرسال تلقائي"],
] as const;

const filters = ["كل الحالات", "IDEA", "WRITING", "DESIGN", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"] as const;

const statusClass: Record<string, string> = {
  PLANNING: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPCOMING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  IDEA: "bg-slate-50 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  REVIEW: "bg-purple-50 text-purple-700 border-purple-200",
  WRITING: "bg-sky-50 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DESIGN: "bg-rose-50 text-rose-700 border-rose-200",
  SCHEDULED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PUBLISHED: "bg-teal-50 text-teal-700 border-teal-200",
};

export default async function OperationsContentPage() {
  const overview = await getOperationsOverview();
  const { kpis, seasons, weeklyThemes, plans, items, tasks } = overview;

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">العمليات والمحتوى</p>
          <h1 className="mt-1.5 text-2xl font-black">لوحة إنتاج المحتوى</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            مركز واحد للمواسم، الخطط، عناصر المحتوى، مهام الإنتاج، وتسليم المواد الجاهزة للتسويق.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="gap-2 font-bold">
            <Link href="/dashboard/archive"><Archive className="h-4 w-4" /> أصول الأرشيف</Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2 font-bold">
            <Link href="/dashboard/brand"><Palette className="h-4 w-4" /> دليل الهوية</Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2 font-bold">
            <Link href="/dashboard/operations">العودة لمركز العمليات <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <ContentItemCreatePanel />
      <OperationsKpis kpis={kpis} />
      <OperationsSeasonsBoard seasons={seasons} weeklyThemes={weeklyThemes} statusClass={statusClass} />
      <OperationsContentWorkspace filters={filters} items={items} plans={plans} boardColumns={boardColumns} statusClass={statusClass} />
      <OperationsProductionTasks tasks={tasks} statusClass={statusClass} />
      <OperationsInfoCards />
    </div>
  );
}
