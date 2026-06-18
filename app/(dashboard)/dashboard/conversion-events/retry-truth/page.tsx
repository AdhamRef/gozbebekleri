import Link from "next/link";
import { ArrowLeft, CircleAlert, RefreshCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getConversionRetryTruthOverview } from "@/lib/tracking/conversion-retry-truth";

export const metadata = {
  title: "مرشحو إعادة إرسال التحويلات | لوحة التحكم",
};

export default async function ConversionRetryTruthPage() {
  const overview = await getConversionRetryTruthOverview(7);

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">ConversionEvent / Retry Truth</p>
        <h1 className="mt-1.5 text-2xl font-black">مرشحو إعادة إرسال التحويلات</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          هذه الصفحة تعتمد على ConversionEvent status، وليس على وجود سجل فقط. الهدف معرفة ما يحتاج مراجعة أو إعادة محاولة بدون تنفيذ إرسال تلقائي.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="مرشحون" value={overview.summary.candidates} icon={<RefreshCcw className="h-5 w-5" />} />
        <SummaryCard title="أحداث فاشلة" value={overview.summary.failedEvents} icon={<CircleAlert className="h-5 w-5" />} />
        <SummaryCard title="أحداث متخطاة" value={overview.summary.skippedEvents} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة التبرعات التي تحتاج مراجعة</CardTitle>
          <CardDescription>كل تبرع هنا مدفوع لكن لا يملك SENT كاملًا لكل أحداث السيرفر المطلوبة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.candidates.length > 0 ? overview.candidates.map((item) => (
            <div key={item.donationId} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="font-black text-slate-900">{item.donationId}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.missingPlatforms.map((platform) => <Badge key={platform} variant="outline">{platform}</Badge>)}
                    <Badge variant="secondary">{item.amount} {item.currency ?? ""}</Badge>
                  </div>
                </div>
                <Link href={`/dashboard/conversion-events?donationId=${item.donationId}`} className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-slate-50">
                  فتح الأحداث
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
              لا توجد تبرعات تحتاج Retry Truth خلال آخر 7 أيام.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>{title}</CardDescription><span className="text-[#025EB8]">{icon}</span></CardHeader><CardContent><CardTitle className="text-3xl">{value}</CardTitle></CardContent></Card>;
}
