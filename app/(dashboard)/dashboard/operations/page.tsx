import Link from "next/link";
import { ArrowLeft, Plus, CalendarDays, ListTodo, AlertCircle, FileSearch, MessageCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getOperationsDaily, type WorkItem } from "@/lib/operations/hub/daily-service";

export const dynamic = "force-dynamic";

function fmt(at: string | null) {
  if (!at) return "";
  try {
    return new Date(at).toLocaleString("ar", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function fmtDate(at: string | null) {
  if (!at) return "—";
  try {
    return new Date(at).toLocaleDateString("ar", { weekday: "short", day: "2-digit", month: "2-digit" });
  } catch {
    return "—";
  }
}

export default async function OperationsDailyPage() {
  const data = await getOperationsDaily();
  const { cards, workList, team, upcoming } = data;

  const cardDefs = [
    { label: "مهام اليوم", value: cards.todayTasks, icon: ListTodo, tone: "text-[#025EB8]", href: "/dashboard/operations/tasks" },
    { label: "متأخر", value: cards.overdue, icon: AlertCircle, tone: cards.overdue > 0 ? "text-rose-600" : "text-slate-400", href: "/dashboard/operations/tasks" },
    { label: "محتوى يحتاج مراجعة", value: cards.needsReview, icon: FileSearch, tone: cards.needsReview > 0 ? "text-amber-600" : "text-slate-400", href: "/dashboard/operations/content" },
    { label: "رسائل تحتاج متابعة", value: cards.repliesNeedingAction, icon: MessageCircle, tone: cards.repliesNeedingAction > 0 ? "text-amber-600" : "text-slate-400", href: "/dashboard/operations/communication/inbox" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-slate-400">لوحة التحكم / التشغيل</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">مركز التشغيل اليومي</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">تابع مهام اليوم، المحتوى، التقويم، وحالة التواصل اليومي.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2"><Link href="/dashboard/operations/tasks"><Plus className="h-4 w-4" /> إنشاء مهمة</Link></Button>
          <Button asChild variant="outline" className="gap-2"><Link href="/dashboard/operations/calendar"><CalendarDays className="h-4 w-4" /> فتح التقويم</Link></Button>
        </div>
      </div>

      {/* 4 cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cardDefs.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}>
              <Card className="border-slate-200 transition hover:border-[#025EB8]/40 hover:shadow-sm"><CardContent className="p-5">
                <Icon className={`h-5 w-5 ${c.tone}`} />
                <div className="mt-2 text-2xl font-black text-slate-900">{c.value}</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">{c.label}</div>
              </CardContent></Card>
            </Link>
          );
        })}
      </section>

      {/* قائمة عمل اليوم */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">قائمة عمل اليوم</h2>
        <Card className="border-slate-200"><CardContent className="p-0">
          {workList.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              لا توجد مهام أو متابعات لليوم. <Link href="/dashboard/operations/tasks" className="font-bold text-[#025EB8]">أنشئ مهمة جديدة</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {workList.map((w) => <WorkRow key={w.id} item={w} />)}
            </ul>
          )}
        </CardContent></Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* الفريق */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-500">الفريق</h2>
          <Card className="border-slate-200"><CardContent className="p-0">
            {team.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">لا توجد مهام موزّعة على الفريق بعد. <Link href="/dashboard/operations/tasks" className="font-bold text-[#025EB8]">إنشاء مهمة</Link>.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {team.map((m) => (
                  <li key={m.name} className="flex items-center justify-between p-3 text-sm">
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <Badge variant="outline" className="border-slate-200 text-slate-500">{m.open} مهمة مفتوحة</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </section>

        {/* المحتوى القادم */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-500">المحتوى القادم</h2>
          <Card className="border-slate-200"><CardContent className="p-0">
            {upcoming.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">لا توجد مواد مجدولة. <Link href="/dashboard/operations/communication/campaigns" className="font-bold text-[#025EB8]">جدولة حملة</Link>.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((u, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-slate-800">{u.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{u.type} · {fmtDate(u.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </section>
      </div>

      {/* روابط سريعة */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">روابط سريعة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "المحتوى والمهام", href: "/dashboard/operations/tasks" },
            { label: "التقويم", href: "/dashboard/operations/calendar" },
            { label: "مركز التواصل", href: "/dashboard/operations/communication" },
            { label: "الأرشيف", href: "/dashboard/archive" },
            { label: "الهوية", href: "/dashboard/brand" },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:border-[#025EB8]/40 hover:shadow-sm">
              {t.label} <ArrowLeft className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

const typeClass: Record<string, string> = {
  "مهمة متأخرة": "border-rose-200 bg-rose-50 text-rose-700",
  "مهمة اليوم": "border-blue-200 bg-blue-50 text-blue-700",
  "مراجعة محتوى": "border-amber-200 bg-amber-50 text-amber-700",
  "حملة مجدولة": "border-violet-200 bg-violet-50 text-violet-700",
  "رد واتساب": "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function WorkRow({ item }: { item: WorkItem }) {
  return (
    <li>
      <Link href={item.href} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{item.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Badge variant="outline" className={typeClass[item.type] ?? "border-slate-200 text-slate-500"}>{item.type}</Badge>
            {item.due ? <span>{fmt(item.due)}</span> : null}
            {item.owner ? <span>· {item.owner}</span> : null}
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300" />
      </Link>
    </li>
  );
}
