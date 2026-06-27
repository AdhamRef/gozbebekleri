import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, FileText, GitBranch, Lightbulb, Send, Sparkles, UserRoundCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsHubOverview } from "@/lib/operations/hub/hub-service";

const iconMap = {
  calendar: CalendarDays,
  "monthly-plan": ClipboardList,
  content: FileText,
  "team-tasks": UserRoundCheck,
  publishing: Send,
  workflow: GitBranch,
  learnings: Lightbulb,
  "ai-assistant": Sparkles,
};

export default async function OperationsHomePage() {
  const overview = await getOperationsHubOverview();
  const primarySections = overview.sections.filter((section) => section.priority === "PRIMARY");

  return <main className="min-h-screen bg-[#FFFDF8] p-4 text-slate-950 sm:p-6" dir="rtl">
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black text-[#025EB8]">العمليات والمحتوى</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">مركز تشغيل الفريق اليومي</h1>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">تابع خطة الشهر، مهام الفريق، سير إنتاج المحتوى، الرسائل، النشر، وما يحتاج تدخّل قبل أن يتأخر العمل.</p>
        </div>
        <Link href="/dashboard/operations/content" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#014c94]">
          فتح لوحة المحتوى
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>

    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric title="مهام اليوم" value={overview.today.tasks} note={overview.today.dateLabel} />
      <Metric title="محتوى الشهر" value={overview.month.requiredContent} note={`${overview.month.completionRate}% مكتمل`} />
      <Metric title="قيد التنفيذ" value={overview.month.inProgressContent} note="نصوص وتصاميم ومراجعات" />
      <Metric title="متأخر" value={overview.month.delayedItems} note="يحتاج متابعة" />
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>تنبيهات العمل</CardTitle>
          <CardDescription>أهم النقاط التي قد تؤخر الخطة أو حملة قادمة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.alerts.length === 0 ? <p className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">لا توجد تنبيهات حرجة حاليًا.</p> : overview.alerts.map((alert) => <Link key={alert.id} href={alert.href} className="block rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-700 hover:border-[#025EB8]/40">
            <p className="font-black text-slate-900">{alert.title}</p>
            <p className="mt-1">{alert.description}</p>
          </Link>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أداء الفريق</CardTitle>
          <CardDescription>متابعة مختصرة حسب المسؤول والمهام المفتوحة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.team.length === 0 ? <p className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">لا توجد مهام موزعة بعد.</p> : overview.team.map((member) => <div key={member.name} className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-black text-slate-900">{member.name}</p><p className="mt-1 text-xs text-slate-500">مهام مفتوحة: {member.openTasks}</p></div>
              <p className="text-2xl font-black text-[#025EB8]">{member.completionRate}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${member.completionRate}%` }} /></div>
          </div>)}
        </CardContent>
      </Card>
    </section>

    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {primarySections.map((section) => {
        const Icon = iconMap[section.key as keyof typeof iconMap] ?? FileText;
        return <Link key={section.key} href={section.href} className="block h-full">
          <Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-sm">
            <CardHeader>
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription className="leading-6">{section.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>;
      })}
    </section>
  </main>;
}

function Metric({ title, value, note }: { title: string; value: number; note: string }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader><CardContent className="text-xs text-slate-500">{note}</CardContent></Card>;
}
