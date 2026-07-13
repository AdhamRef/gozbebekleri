import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessagingCampaignCreate } from "@/components/operations/messaging/MessagingCampaignCreate";
import { MessagingItemActions } from "@/components/operations/messaging/MessagingItemActions";
import { MessagingTemplateCreate } from "@/components/operations/messaging/MessagingTemplateCreate";
import { communicationProviderRegistry } from "@/lib/communication/provider-registry";
import { getMessagingOverview } from "@/lib/operations/messaging/messaging-repository";

function templateStatusLabel(status: string) {
  const labels: Record<string, string> = { DRAFT: "مسودة", NEEDS_REVIEW: "تحتاج مراجعة", APPROVED: "معتمد", ARCHIVED: "مؤرشف" };
  return labels[status] ?? status;
}

function campaignStatusLabel(status: string) {
  const labels: Record<string, string> = { PLANNING: "تخطيط", READY_FOR_REVIEW: "جاهزة للمراجعة", APPROVED: "معتمدة", SCHEDULED: "مجدولة", MANUAL_SENT: "تم التنفيذ يدويًا", CANCELLED: "ملغاة" };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (["APPROVED", "MANUAL_SENT"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["NEEDS_REVIEW", "READY_FOR_REVIEW"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "SCHEDULED") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function providerStatusLabel(status: string) {
  const labels: Record<string, string> = { NOT_CONFIGURED: "غير مربوط", CONFIGURED: "مربوط", NEEDS_ATTENTION: "يحتاج متابعة", DISABLED: "مؤجل" };
  return labels[status] ?? status;
}

export default async function OperationsMessagingPage() {
  const overview = await getMessagingOverview();

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل</p>
            <h1 className="mt-1.5 text-2xl font-black">مركز التواصل</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">واجهة واحدة لقنوات واتساب، الإيميل، و SMS، مع مزودين قابلين للتبديل ومراجعة بشرية قبل أي إرسال.</p>
          </div>
          <Button asChild variant="secondary" className="gap-2 font-bold">
            <Link href="/dashboard/operations">العودة لمركز العمليات <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric title="القوالب" value={overview.summary.templates} />
        <Metric title="الحملات" value={overview.summary.campaigns} />
        <Metric title="تحتاج مراجعة" value={overview.summary.needsReview} />
        <Metric title="معتمد" value={overview.summary.approved} />
        <Metric title="مجدول" value={overview.summary.scheduled} />
        <Metric title="منفذ يدويًا" value={overview.summary.manualSent} />
      </section>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">{overview.safety.note}</CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {communicationProviderRegistry.map((provider) => (
          <Card key={provider.key}>
            <CardHeader>
              <CardDescription>{provider.channel}</CardDescription>
              <CardTitle className="text-base">{provider.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-5 text-slate-500">
              <Badge variant="outline" className={provider.status === "CONFIGURED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{providerStatusLabel(provider.status)}</Badge>
              <p>{provider.notes}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MessagingTemplateCreate />
        <MessagingCampaignCreate />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#025EB8]" /> قوالب الرسائل</CardTitle>
            <CardDescription>كل قالب قابل للتعديل أو الحذف، ولا يستخدم للإرسال الحقيقي إلا بعد ربط المزود والموافقة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.templates.map((template) => (
              <div key={template.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-black text-slate-900">{template.title}</h3><p className="mt-1 text-xs text-slate-500">{template.channel} · {template.category} · {template.language}</p></div>
                  <Badge variant="outline" className={statusClass(template.status)}>{templateStatusLabel(template.status)}</Badge>
                </div>
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{template.body}</p>
                {template.cta ? <p className="mt-2 text-xs font-bold text-[#025EB8]">{template.cta}</p> : null}
                <MessagingItemActions kind="template" item={template} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حملات الرسائل</CardTitle>
            <CardDescription>تخطيط داخلي للحملات وتسجيل التنفيذ اليدوي فقط عند خروجه خارج النظام.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-black text-slate-900">{campaign.title}</h3><p className="mt-1 text-xs text-slate-500">{campaign.channel} · {campaign.audience}</p></div>
                  <Badge variant="outline" className={statusClass(campaign.status)}>{campaignStatusLabel(campaign.status)}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p>الهدف: <b>{campaign.objective}</b></p>
                  <p>الموعد: <b>{campaign.scheduledAt || "غير محدد"}</b></p>
                  <p>المسؤول: <b>{campaign.owner || "غير محدد"}</b></p>
                  <p>القالب: <b>{campaign.templateId || "غير محدد"}</b></p>
                </div>
                {campaign.notes ? <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{campaign.notes}</p> : null}
                <MessagingItemActions kind="campaign" item={campaign} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}
