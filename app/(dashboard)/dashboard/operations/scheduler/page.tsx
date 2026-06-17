import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSchedulerOverview } from "@/lib/operations/scheduler/scheduler-service";

export const metadata = {
  title: "جدولة المحتوى | لوحة التحكم",
};

export default function OperationsSchedulerPage() {
  const overview = getSchedulerOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Content & Operations / Scheduler</p>
        <h1 className="mt-1.5 text-2xl font-black">جدولة المحتوى</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          نسخة تأسيسية لتنظيم عناصر المحتوى والتذكيرات قبل ربط أي تشغيل خارجي.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="كل العناصر" value={overview.summary.total} />
        <SummaryCard title="مجدول" value={overview.summary.scheduled} />
        <SummaryCard title="جاهز" value={overview.summary.ready} />
        <SummaryCard title="محجوب" value={overview.summary.blocked} />
        <SummaryCard title="عناصر رسائل" value={overview.summary.messagingItems} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الجدولة</CardTitle>
          <CardDescription>كل عنصر هنا يحتاج مراجعة بشرية قبل أي تنفيذ.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {overview.items.map((item) => (
            <div key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-[#025EB8]"><CalendarClock className="h-4 w-4" /></span>
                    <h2 className="font-black text-slate-900">{item.title}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p><span className="font-bold text-slate-900">القناة:</span> {item.channel}</p>
                <p><span className="font-bold text-slate-900">الموعد:</span> {item.scheduledFor}</p>
                <p><span className="font-bold text-slate-900">المسؤول:</span> {item.owner}</p>
                <p><span className="font-bold text-slate-900">الحملة:</span> {item.campaignTheme}</p>
              </div>
              {item.contentUrl ? <Link href={item.contentUrl} className="mt-4 inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-bold text-[#025EB8] hover:bg-slate-50">فتح المادة<ArrowLeft className="h-3 w-3" /></Link> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}
