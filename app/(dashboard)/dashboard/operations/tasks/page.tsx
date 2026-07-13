import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, ListChecks, PlusCircle, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationTaskActions } from "@/components/dashboard/operations/OperationTaskActions";
import { OperationTaskCreateForm } from "@/components/dashboard/operations/OperationTaskCreateForm";
import { OperationTaskQuickEdit } from "@/components/dashboard/operations/OperationTaskQuickEdit";
import { getTaskOverview } from "@/lib/operations/tasks/task-service";

export const dynamic = "force-dynamic";

const priorityClass: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const priorityLabel: Record<string, string> = {
  HIGH: "أولوية عالية",
  MEDIUM: "أولوية متوسطة",
  LOW: "أولوية منخفضة",
};

const statusLabel: Record<string, string> = {
  PENDING: "بانتظار التنفيذ",
  IN_PROGRESS: "قيد التنفيذ",
  NEEDS_REVIEW: "تحتاج مراجعة",
  DONE: "منتهية",
  MISSED: "فات موعدها",
  DELAYED: "متأخرة",
  CANCELLED: "ملغاة",
  BLOCKED: "محجوبة",
};

const statusClass: Record<string, string> = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  NEEDS_REVIEW: "border-violet-200 bg-violet-50 text-violet-700",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MISSED: "border-rose-200 bg-rose-50 text-rose-700",
  DELAYED: "border-orange-200 bg-orange-50 text-orange-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-500",
  BLOCKED: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function OperationsTasksPage() {
  const overview = await getTaskOverview();
  const isDbBacked = overview.persistence.mode === "prisma";
  const canMutateTasks = isDbBacked && !overview.persistence.readOnly;

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold text-[#025EB8]">المحتوى والتشغيل / مهام المحتوى</p>
          <h1 className="mt-1 text-xl font-black text-slate-900">مهام المحتوى</h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
            حوّل الأفكار والحملات إلى مهام واضحة قابلة للمتابعة.
          </p>
        </div>
        <Link href="/dashboard/operations/calendar" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#025EB8]/50 hover:text-[#025EB8]">
          فتح التقويم والتنبيهات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardDescription>إجمالي المهام</CardDescription><CardTitle className="text-3xl">{overview.summary.totalTasks}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>بانتظار التنفيذ</CardDescription><CardTitle className="text-3xl">{overview.summary.pending}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>قيد التنفيذ</CardDescription><CardTitle className="text-3xl">{overview.summary.inProgress}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>محجوبة</CardDescription><CardTitle className="text-3xl">{overview.summary.blocked}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>منتهية</CardDescription><CardTitle className="text-3xl">{overview.summary.done}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>أولوية عالية</CardDescription><CardTitle className="text-3xl">{overview.summary.highPriority}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-[#025EB8]" /> إنشاء مهمة</CardTitle>
          <CardDescription className="leading-6">
            أضف مهمة يدوية للفريق بدون إرسال أو نشر تلقائي.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperationTaskCreateForm isFoundationMode={!isDbBacked} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-[#025EB8]" /> قائمة مهام المحتوى</CardTitle>
          <CardDescription>
            {isDbBacked
              ? "متابعة مهام الفريق مع تحديث الحالة والتعديل السريع من الواجهة."
              : "لا توجد مهام محفوظة بعد؛ تُعرض هنا مهام مقترحة من الخطة حتى تُضاف أول مهمة."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {overview.tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">{task.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{task.sourceReason}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={priorityClass[task.priority]}>{priorityLabel[task.priority] ?? task.priority}</Badge>
                  <Badge variant="outline" className={statusClass[task.status]}>{statusLabel[task.status] ?? task.status}</Badge>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#025EB8]" /> {task.assignee}</span>
                <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#025EB8]" /> {task.dueLabel}</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#025EB8]" /> {task.progress}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${task.progress}%` }} />
              </div>

              <OperationTaskActions taskId={task.id} status={task.status} canMutate={canMutateTasks} />
              <OperationTaskQuickEdit taskId={task.id} title={task.title} priority={task.priority} dueLabel={task.dueLabel} canMutate={canMutateTasks} />

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-xs font-bold">
                <Link href="/dashboard/archive" className="text-[#025EB8] underline-offset-4 hover:underline">اختيار ملفات من الأرشيف</Link>
                <Link href="/dashboard/brand" className="text-[#025EB8] underline-offset-4 hover:underline">مراجعة دليل الهوية</Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#025EB8]/20 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#025EB8]" /> القادم</CardTitle>
          <CardDescription className="leading-6">
            المهام تقبل الإنشاء والتعديل السريع والانتقالات اليومية. قريبًا: ربط المهام مباشرة بعناصر المحتوى ومواد الأرشيف.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}