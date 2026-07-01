import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceRecordActions } from "@/components/operations/marketing-performance/PerformanceRecordActions";
import { PerformanceRecordCreate } from "@/components/operations/marketing-performance/PerformanceRecordCreate";
import { getMarketingPerformanceOverview } from "@/lib/operations/marketing-performance/performance-repository";

function n(value: number) {
  return new Intl.NumberFormat("ar", { maximumFractionDigits: 0 }).format(value);
}

export default async function MarketingPerformancePage() {
  const overview = await getMarketingPerformanceOverview();
  return <main className="space-y-5 p-4 sm:p-6" dir="rtl">
    <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">العمليات والأداء</p>
          <h1 className="mt-1.5 text-2xl font-black">مركز أداء الإعلانات</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">تجميع نتائج الحملات وربطها بالمحتوى لاتخاذ قرارات أفضل بدون أي تعديل تلقائي.</p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations">العودة لمركز العمليات <ArrowLeft className="h-4 w-4" /></Link></Button>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Metric title="السجلات" value={overview.summary.records} />
      <Metric title="الإنفاق" value={n(overview.summary.spend)} />
      <Metric title="التبرعات" value={overview.summary.donations} />
      <Metric title="القيمة" value={n(overview.summary.donationValue)} />
      <Metric title="CPA" value={n(overview.summary.averageCpa)} />
      <Metric title="ROAS" value={`${overview.summary.roas}x`} />
    </section>

    <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">{overview.safety.note}</CardContent></Card>
    <PerformanceRecordCreate />

    <Card>
      <CardHeader><CardTitle>سجلات الأداء</CardTitle><CardDescription>قياس يدوي ومنظم لنتائج الحملات.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {overview.records.map((record) => <div key={record.id} className="rounded-2xl border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-black text-slate-900">{record.title}</h3><p className="mt-1 text-xs text-slate-500">{record.platform} · {record.campaignName}</p></div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{record.status}</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <p>الإنفاق: <b>{n(record.spend)}</b></p>
            <p>التبرعات: <b>{record.donations}</b></p>
            <p>القيمة: <b>{n(record.donationValue)}</b></p>
            <p>النقرات: <b>{record.clicks}</b></p>
            <p>التحويلات: <b>{record.conversions}</b></p>
            <p>الظهور: <b>{record.impressions}</b></p>
          </div>
          <PerformanceRecordActions record={record} />
        </div>)}
      </CardContent>
    </Card>
  </main>;
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader></Card>;
}
