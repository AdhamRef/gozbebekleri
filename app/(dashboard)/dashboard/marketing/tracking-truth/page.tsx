import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversionRetryTruthOverview } from "@/lib/tracking/conversion-retry-truth";

export const metadata = {
  title: "حقيقة التتبع | لوحة التحكم",
};

export default async function TrackingTruthPage() {
  const overview = await getConversionRetryTruthOverview(7);

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Package 2 / Tracking Truth</p>
        <h1 className="mt-1.5 text-2xl font-black">حقيقة التتبع والتحويلات</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          هذه الصفحة تستخدم ConversionEvent كمصدر الحقيقة، وتعرض التبرعات التي تحتاج مراجعة أو retry بناءً على status الحقيقي وليس مجرد وجود سجل.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="تحتاج مراجعة" value={overview.summary.candidates} icon={<RotateCcw className="h-5 w-5" />} />
        <SummaryCard title="أحداث فاشلة" value={overview.summary.failedEvents} icon={<CircleAlert className="h-5 w-5" />} />
        <SummaryCard title="أحداث متخطاة" value={overview.summary.skippedEvents} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retry Candidates</CardTitle>
          <CardDescription>
            التبرعات المدفوعة آخر 7 أيام التي لا يوجد لها SENT كامل في أحداث السيرفر المطلوبة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.candidates.length > 0 ? overview.candidates.map((candidate) => (
            <div key={candidate.donationId} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-900">Donation {candidate.donationId}</h2>
                    <Badge variant="outline">{candidate.status}</Badge>
                    <Badge variant="secondary">{candidate.amount} {candidate.currency ?? ""}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.reason}</p>
                  {candidate.missingPlatforms.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {candidate.missingPlatforms.map((item) => <Badge key={item} variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{item}</Badge>)}
                    </div>
                  ) : null}
                </div>
                <Link
                  href={`/dashboard/conversion-events?donationId=${encodeURIComponent(candidate.donationId)}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold text-[#025EB8] hover:bg-slate-50"
                >
                  فتح أحداث التبرع
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
              لا توجد تبرعات تحتاج retry بناءً على ConversionEvent خلال آخر 7 أيام.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قاعدة الحزمة الثانية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-slate-600">
          <p>ConversionEvent هو مصدر الحقيقة لحالة التحويلات.</p>
          <p>وجود event لا يعني نجاحه؛ النجاح يعني status = SENT.</p>
          <p>conversionEventsSentAt يبقى مؤشر legacy ولا يُستخدم وحده للحكم على نجاح المنصات.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>{title}</CardDescription><span className="text-[#025EB8]">{icon}</span></CardHeader><CardContent><CardTitle className="text-3xl">{value}</CardTitle></CardContent></Card>;
}
