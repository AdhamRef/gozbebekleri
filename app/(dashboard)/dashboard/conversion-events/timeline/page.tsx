import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDonationConversionTimeline } from "@/lib/tracking/conversion-timeline-service";

export const metadata = {
  title: "Conversion Timeline | لوحة التحكم",
};

function statusLabel(status: string) {
  if (status === "SENT") return "تم الإرسال";
  if (status === "FAILED") return "فشل";
  if (status === "SKIPPED") return "تم التخطي";
  if (status === "PENDING") return "قيد الانتظار";
  return "غير معروف";
}

function statusClass(status: string) {
  if (status === "SENT") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "SKIPPED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "PENDING") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusIcon(status: string) {
  if (status === "SENT") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "FAILED") return <CircleAlert className="h-4 w-4 text-rose-600" />;
  if (status === "SKIPPED") return <MinusCircle className="h-4 w-4 text-amber-600" />;
  return <Clock className="h-4 w-4 text-blue-600" />;
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ConversionTimelinePage({ searchParams }: { searchParams: Promise<{ donationId?: string }> }) {
  const params = await searchParams;
  const donationId = params.donationId?.trim();
  if (!donationId) notFound();

  const timeline = await getDonationConversionTimeline(donationId);

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">ConversionEvent / Donation Timeline</p>
        <h1 className="mt-1.5 text-2xl font-black">مسار تحويل التبرع</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          عرض تفصيلي لكل أحداث التحويل المسجلة لهذا التبرع حسب المنصة والقناة والحالة.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="font-mono text-lg">{timeline.donationId}</CardTitle>
              <CardDescription>
                المصدر: {timeline.source} · آخر توليد: {dateLabel(timeline.generatedAt)}
              </CardDescription>
            </div>
            <Link href="/dashboard/conversion-events" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-slate-50">
              العودة لأحداث التحويل
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Summary title="الأحداث" value={timeline.summary.totalEvents} />
          <Summary title="تم الإرسال" value={timeline.summary.sent} />
          <Summary title="فشل" value={timeline.summary.failed} />
          <Summary title="تحتاج Retry" value={timeline.summary.serverNeedsRetry} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>الترتيب الزمني للأحداث المسجلة لهذا التبرع.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.events.length === 0 ? (
              <div className="rounded-2xl border bg-slate-50 p-5 text-sm text-slate-600">لا توجد أحداث مسجلة لهذا التبرع.</div>
            ) : timeline.events.map((event, index) => (
              <div key={`${event.eventId ?? event.id ?? index}-${index}`} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50">{statusIcon(event.status)}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-black text-slate-900">{event.platform ?? "UNKNOWN"} · {event.channel ?? "—"}</h2>
                        <Badge variant="outline" className={statusClass(event.status)}>{statusLabel(event.status)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{event.eventName ?? "event"} · محاولات: {event.attempts ?? 0}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{dateLabel(event.updatedAt ?? event.sentAt ?? event.createdAt)}</div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                  <p><span className="font-bold text-slate-800">Event ID:</span> {event.eventId ?? "—"}</p>
                  <p><span className="font-bold text-slate-800">Value:</span> {typeof event.value === "number" ? `${event.value} ${event.currency ?? ""}` : "—"}</p>
                </div>
                {event.error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{event.error}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الإجراءات المقترحة</CardTitle>
            <CardDescription>مبنية على حالات ConversionEvent لهذا التبرع.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-slate-600">
            {timeline.nextActions.map((action) => <p key={action}>• {action}</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({ title, value }: { title: string; value: number }) {
  return <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-xs text-slate-500">{title}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>;
}
