import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, CircleAlert, ClipboardList, LayoutDashboard, Plug, Rocket, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { serializeConnection } from "@/lib/marketing/connection-serializer";
import { getOperationsOverview } from "@/lib/operations/service";
import { buildExecutiveOverview, type ExecutiveAction } from "@/lib/executive/executive-overview-service";

export const metadata = {
  title: "النظرة التنفيذية | لوحة التحكم",
};

const priorityLabel: Record<ExecutiveAction["priority"], string> = {
  HIGH: "عالي",
  MEDIUM: "متوسط",
  LOW: "منخفض",
};

const priorityClass: Record<ExecutiveAction["priority"], string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const areaLabel: Record<ExecutiveAction["area"], string> = {
  MARKETING: "تسويق",
  OPERATIONS: "تشغيل",
  INTEGRATIONS: "تكاملات",
};

const areaClass: Record<ExecutiveAction["area"], string> = {
  MARKETING: "border-blue-200 bg-blue-50 text-blue-700",
  OPERATIONS: "border-violet-200 bg-violet-50 text-violet-700",
  INTEGRATIONS: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

async function getExecutiveOverview() {
  const [connections, operations] = await Promise.all([
    prisma.marketingPlatformConnection.findMany({
      orderBy: [
        { defaultForPlatform: "desc" },
        { category: "asc" },
        { platform: "asc" },
        { name: "asc" },
      ],
    }),
    getOperationsOverview(),
  ]);

  return buildExecutiveOverview({
    connections: connections.map(serializeConnection),
    operations,
  });
}

export default async function ExecutiveOverviewPage() {
  const overview = await getExecutiveOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">Executive System Overview</p>
            <h1 className="mt-1.5 text-2xl font-black">النظرة التنفيذية للنظام</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
              صفحة واحدة تجمع إشارات التسويق، المحتوى، التشغيل، والتكاملات في قائمة قرارات واضحة للإدارة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/marketing/command-center"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90"
            >
              قيادة التسويق
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/operations/command-center"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              قيادة المحتوى
              <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <SummaryCard title="إجراءات عاجلة" value={overview.summary.highPriorityActions} icon={<CircleAlert className="h-5 w-5" />} />
        <SummaryCard title="إجراءات تسويق" value={overview.summary.marketingActions} icon={<BarChart3 className="h-5 w-5" />} />
        <SummaryCard title="إجراءات تشغيل" value={overview.summary.operationsActions} icon={<ClipboardList className="h-5 w-5" />} />
        <SummaryCard title="تكاملات جاهزة" value={overview.summary.providerReady} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard title="تكاملات تحتاج عمل" value={overview.summary.providerNeedsWork} icon={<Plug className="h-5 w-5" />} />
        <SummaryCard title="مهام تشغيل مفتوحة" value={overview.summary.openOperationalTasks} icon={<LayoutDashboard className="h-5 w-5" />} />
        <SummaryCard title="جاهز للتسويق" value={overview.summary.readyForMarketing} icon={<Rocket className="h-5 w-5" />} />
        <SummaryCard title="ROAS" value={`${overview.summary.averageRoas}x`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>أهم قرارات اليوم</CardTitle>
            <CardDescription>
              أعلى الإجراءات أولوية من التسويق والمحتوى والتكاملات في مكان واحد.
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
                        <Badge variant="outline" className={areaClass[action.area]}>
                          {areaLabel[action.area]}
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
                لا توجد إجراءات عاجلة الآن. تابع مراكز القيادة بشكل دوري.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مراكز القيادة</CardTitle>
              <CardDescription>اختصارات للأنظمة التنفيذية الحالية.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLink href="/dashboard/marketing/command-center" title="مركز قيادة التسويق" icon={<BarChart3 className="h-4 w-4" />} />
              <QuickLink href="/dashboard/operations/command-center" title="مركز قيادة المحتوى" icon={<ClipboardList className="h-4 w-4" />} />
              <QuickLink href="/dashboard/marketing/connections/catalog" title="صحة التكاملات" icon={<Plug className="h-4 w-4" />} />
              <QuickLink href="/dashboard/operations/production" title="لوحة الإنتاج" icon={<Rocket className="h-4 w-4" />} />
              <QuickLink href="/dashboard/marketing/recommendations" title="توصيات التسويق" icon={<Sparkles className="h-4 w-4" />} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>حدود النسخة الحالية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-slate-600">
              <p>هذه الصفحة تجمع مؤشرات حالية ولا تنفذ أي إجراءات تلقائية.</p>
              <p>لا تغيّر قاعدة البيانات ولا تستدعي منصات خارجية.</p>
              <p>لاحقًا يمكن إضافة Executive Daily Report وAI summary.</p>
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
