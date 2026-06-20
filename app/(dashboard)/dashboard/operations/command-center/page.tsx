import type { ReactNode } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, Film, Layers3, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsOverview } from "@/lib/operations/service";
import { buildOperationsCommandCenterOverview, type OperationsCommandPriority } from "@/lib/operations/command-center/command-center-service";

export const metadata = {
  title: "مركز قيادة المحتوى والتشغيل | لوحة التحكم",
};

const priorityLabel: Record<OperationsCommandPriority, string> = {
  HIGH: "عالي",
  MEDIUM: "متوسط",
  LOW: "منخفض",
};

const priorityClass: Record<OperationsCommandPriority, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

export default async function OperationsCommandCenterPage() {
  const operations = await getOperationsOverview();
  const overview = await buildOperationsCommandCenterOverview(operations);

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">Content & Operations Command Center</p>
            <h1 className="mt-1.5 text-2xl font-black">مركز قيادة المحتوى والتشغيل</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
              صفحة تنفيذية تجمع المواسم، المهام، الإنتاج، والأرشيف في قائمة إجراءات واحدة تساعد الفريق يعرف ماذا ينتج وماذا يسلّم بعد ذلك.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/operations/production"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90"
            >
              لوحة الإنتاج
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/operations/archive"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              الأرشيف
              <Archive className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <SummaryCard title="مواسم مفتوحة" value={overview.summary.openSeasons} icon={<CalendarDays className="h-5 w-5" />} />
        <SummaryCard title="خطط نشطة" value={overview.summary.activePlans} icon={<Layers3 className="h-5 w-5" />} />
        <SummaryCard title="مهام مفتوحة" value={overview.summary.openTasks} icon={<ClipboardList className="h-5 w-5" />} />
        <SummaryCard title="مهام معطلة" value={overview.summary.blockedTasks} icon={<CircleAlert className="h-5 w-5" />} />
        <SummaryCard title="إنتاج جاهز" value={overview.summary.productionReady} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard title="أرشيف جاهز" value={overview.summary.archiveReady} icon={<Archive className="h-5 w-5" />} />
        <SummaryCard title="جاهز للتسويق" value={overview.summary.readyForMarketing} icon={<Rocket className="h-5 w-5" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>قائمة إجراءات المحتوى</CardTitle>
            <CardDescription>
              أهم الخطوات التالية مبنية على المواسم، المهام، حالة الإنتاج، وجاهزية الأرشيف.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.actions.length > 0 ? (
              overview.actions.map((action, index) => (
                <div key={action.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <h2 className="font-black text-slate-900">{action.title}</h2>
                        <Badge variant="outline" className={priorityClass[action.priority]}>
                          أولوية {priorityLabel[action.priority]}
                        </Badge>
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">{action.reason}</p>
                    </div>
                    <Link
                      href={action.href}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold text-[#025EB8] hover:bg-slate-50"
                    >
                      {action.cta}
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
                لا توجد إجراءات عاجلة الآن. راقب التقويم، الإنتاج، والأرشيف بشكل دوري.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>روابط تشغيلية</CardTitle>
              <CardDescription>اختصارات لأهم صفحات المحتوى والتشغيل.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLink href="/dashboard/operations/calendar" title="التقويم والتنبيهات" icon={<CalendarDays className="h-4 w-4" />} />
              <QuickLink href="/dashboard/operations/tasks" title="مهام الإنتاج" icon={<ClipboardList className="h-4 w-4" />} />
              <QuickLink href="/dashboard/operations/production" title="لوحة الإنتاج" icon={<Film className="h-4 w-4" />} />
              <QuickLink href="/dashboard/operations/archive" title="الأرشيف" icon={<Archive className="h-4 w-4" />} />
              <QuickLink href="/dashboard/operations/content" title="لوحة المحتوى" icon={<Layers3 className="h-4 w-4" />} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>قاعدة التشغيل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-slate-600">
              <p>هذه الصفحة لا تغيّر بيانات الإنتاج ولا تنشر محتوى تلقائيًا.</p>
              <p>تعتمد على services الحالية لتجميع مؤشرات التشغيل في قائمة إجراءات واضحة.</p>
              <p>الغرض منها توجيه الفريق لما يجب إنتاجه أو تسليمه أو أرشفته بعد ذلك.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        <span className="text-[#025EB8]">{icon}</span>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, title, icon }: { href: string; title: string; icon: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
      <span className="flex items-center gap-2">
        <span className="text-[#025EB8]">{icon}</span>
        {title}
      </span>
      <ArrowLeft className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
