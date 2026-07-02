import Link from "next/link";
import { ArrowLeft, FileText, PlugZap, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunicationCenterOverview } from "@/lib/communication/communication-service";
import { getProviderConnectionsReadiness } from "@/lib/communication/provider-connections";

function statusLabel(status: string) {
  const labels: Record<string, string> = { CONFIGURED: "مكتمل", NEEDS_ATTENTION: "يحتاج استكمال", NOT_CONFIGURED: "غير مربوط", DISABLED: "مؤجل" };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "CONFIGURED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "NEEDS_ATTENTION") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function CommunicationCenterPage() {
  const [overview, providers] = await Promise.all([getCommunicationCenterOverview(), Promise.resolve(getProviderConnectionsReadiness())]);
  return <main className="space-y-5 p-4 sm:p-6" dir="rtl">
    <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Communication Center</p>
          <h1 className="mt-1.5 text-2xl font-black">مركز التواصل</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">مركز موحد لقنوات واتساب، الإيميل، و SMS. المزودين في الخلف، والواجهة واحدة للفريق.</p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations">العودة لمركز العمليات <ArrowLeft className="h-4 w-4" /></Link></Button>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Metric title="المزودون" value={overview.summary.providers} />
      <Metric title="القوالب" value={overview.summary.templates} />
      <Metric title="الحملات" value={overview.summary.campaigns} />
      <Metric title="تحتاج مراجعة" value={overview.summary.needsReview} />
      <Metric title="معتمد" value={overview.summary.approved} />
      <Metric title="مجدول" value={overview.summary.scheduled} />
    </section>

    <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">{overview.safety.note}</CardContent></Card>

    <section className="grid gap-4 lg:grid-cols-3">
      <Link href="/dashboard/operations/communication/providers" className="block h-full"><Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-sm"><CardHeader><PlugZap className="mb-2 h-6 w-6 text-[#025EB8]" /><CardTitle>ربط المزودين</CardTitle><CardDescription className="leading-6">حالة Meta WhatsApp و Brevo Email و Brevo SMS بدون عرض أسرار.</CardDescription></CardHeader></Card></Link>
      <Link href="/dashboard/operations/communication/templates" className="block h-full"><Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-sm"><CardHeader><FileText className="mb-2 h-6 w-6 text-[#025EB8]" /><CardTitle>القوالب والمتغيرات</CardTitle><CardDescription className="leading-6">قوالب موحدة، متغيرات، ومعاينة آمنة قبل أي إرسال.</CardDescription></CardHeader></Card></Link>
      <Card className="h-full"><CardHeader><ShieldCheck className="mb-2 h-6 w-6 text-[#025EB8]" /><CardTitle>الأمان أولًا</CardTitle><CardDescription className="leading-6">لا إرسال حقيقي، لا مفاتيح في الواجهة، ولا حملات بدون موافقات.</CardDescription></CardHeader></Card>
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {providers.map((provider) => <Card key={provider.key}><CardHeader><CardDescription>{provider.channel}</CardDescription><CardTitle className="text-base">{provider.name}</CardTitle></CardHeader><CardContent className="space-y-3"><Badge variant="outline" className={statusClass(provider.status)}>{statusLabel(provider.status)}</Badge><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${provider.readinessPercent}%` }} /></div><p className="text-xs leading-5 text-slate-500">{provider.actionLabel}</p></CardContent></Card>)}
    </section>
  </main>;
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}
