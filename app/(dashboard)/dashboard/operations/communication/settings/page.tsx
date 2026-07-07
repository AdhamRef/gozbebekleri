import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Radio, Route, ScrollText, Activity, Mail, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSchedulerStatus } from "@/lib/communication/scheduler-status";
import { ProviderTestPanel } from "./_components/ProviderTestPanel";

export const dynamic = "force-dynamic";

async function whatsappReadiness() {
  const env = (k: string) => !!process.env[k]?.trim();
  let sendersWithNumber = 0;
  let lastWebhookAt: Date | null = null;
  if (process.env.DATABASE_URL) {
    sendersWithNumber = await prisma.communicationSender.count({ where: { channel: "WHATSAPP", phoneNumberId: { not: null } } }).catch(() => 0);
    const ev = await prisma.communicationProviderEvent.findFirst({ where: { channel: "WHATSAPP" }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }).catch(() => null);
    lastWebhookAt = ev?.receivedAt ?? null;
  }
  const checklist = [
    { label: "رمز الوصول مُعد", ok: env("META_WHATSAPP_ACCESS_TOKEN") },
    { label: "رمز التطبيق السري مُعد", ok: env("META_WHATSAPP_APP_SECRET") },
    { label: "رمز التحقق مُعد", ok: env("META_WHATSAPP_WEBHOOK_VERIFY_TOKEN") },
    { label: "معرّف حساب الأعمال مُعد", ok: env("META_WHATSAPP_BUSINESS_ACCOUNT_ID") },
    { label: "رقم واتساب واحد على الأقل", ok: sendersWithNumber > 0 },
    { label: "تم استقبال حدث من المزود", ok: !!lastWebhookAt },
  ];
  return { checklist, lastWebhookAt, signatureConfigured: env("META_WHATSAPP_APP_SECRET") };
}

const advanced = [
  { label: "أرقام واتساب والمُرسِلون", href: "/dashboard/operations/communication/senders", icon: Radio, desc: "أرقام واتساب ومُرسِلو الإيميل والرسائل — دون أي مفاتيح." },
  { label: "قواعد اختيار رقم الإرسال", href: "/dashboard/operations/communication/routing", icon: Route, desc: "اختيار المُرسِل حسب اللغة والدولة والغرض." },
  { label: "سجل الرسائل", href: "/dashboard/operations/communication/delivery-logs", icon: ScrollText, desc: "أرشيف كل رسالة مُجهّزة أو مُرسَلة مع الحالة والسبب." },
  { label: "أحداث المزود", href: "/dashboard/operations/communication/provider-events", icon: Activity, desc: "أحداث التسليم والقراءة والفشل بنسختها الآمنة." },
];

export default async function CommunicationSettingsPage() {
  const [wa, scheduler] = await Promise.all([whatsappReadiness(), getSchedulerStatus()]);
  const checklist = wa.checklist;
  const ready = checklist.filter((c) => c.ok).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-slate-400">التواصل / الإعدادات المتقدمة</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">إعدادات الإرسال</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">جاهزية الإرسال، أرقام واتساب، مُرسلو الإيميل، وقواعد اختيار رقم الإرسال.</p>
        </div>
        <Button asChild variant="outline" className="gap-2"><Link href="/dashboard/operations/communication">العودة <ArrowLeft className="h-4 w-4" /></Link></Button>
      </div>

      {/* WhatsApp readiness */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">جاهزية واتساب</CardTitle>
          <CardDescription>{ready}/{checklist.length} مكتمل. الإرسال الفعلي يبدأ بعد اكتمال الإعداد واستقبال أول حدث.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {checklist.map((c) => (
            <div key={c.label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}
              <span className={c.ok ? "text-slate-700" : "text-slate-500"}>{c.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Provider live QA — test tools */}
      <section>
        <h2 className="mb-1 text-sm font-bold text-slate-500">اختبار المزوّدين مباشرة</h2>
        <p className="mb-3 text-xs leading-6 text-slate-400">إرسال رسالة اختبار واحدة فقط لتأكيد جاهزية القناة. تُؤرشَف كل رسالة اختبار في السجل، ولا تُسجَّل جهة المستلم كمتبرّع.</p>
        <ProviderTestPanel webhookPath="/api/webhooks/meta/whatsapp" signatureConfigured={wa.signatureConfigured} lastWebhookAt={wa.lastWebhookAt ? wa.lastWebhookAt.toISOString() : null} />
      </section>

      {/* Scheduler readiness */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">جاهزية الجدولة</CardTitle>
          <CardDescription>{scheduler.configured ? "الجدولة تعمل تلقائيًا — الحملات المجدولة تُنفَّذ عند حلول موعدها." : "الجدولة محفوظة لكنها تحتاج تفعيل Cron حتى تُنفَّذ تلقائيًا."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            {scheduler.configured ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}
            <span className={scheduler.configured ? "text-slate-700" : "text-slate-500"}>التنفيذ التلقائي (Cron) {scheduler.configured ? "مُفعّل" : "غير مُفعّل"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-600"><Clock className="h-4 w-4 text-slate-400" /> آخر تشغيل: {scheduler.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleString("ar") : "لم يعمل بعد"}</div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-600">حملات مجدولة: <b className="text-slate-800">{scheduler.scheduledCount}</b></div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-600">مستحقة الآن: <b className={scheduler.dueCount > 0 && !scheduler.configured ? "text-amber-700" : "text-slate-800"}>{scheduler.dueCount}</b></div>
        </CardContent>
      </Card>

      {/* Email note */}
      <Card className="border-slate-200">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <Mail className="h-5 w-5 text-[#025EB8]" />
          <span className="text-slate-600">مُرسلو الإيميل يُدارون من صفحة المُرسِلين.</span>
        </CardContent>
      </Card>

      {/* SMS status */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold text-amber-900">الرسائل القصيرة — غير مفعّلة</p>
            <p className="mt-0.5 leading-6 text-amber-800">الرسائل القصيرة غير مفعّلة بعد. سيتم تفعيلها بعد ربط مزوّد الرسائل (Netgsm لتركيا / Twilio للدولي). حتى ذلك الحين لا يمكن إنشاء حملة رسائل أو إرسالها.</p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced links */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">أدوات متقدمة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {advanced.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#025EB8]/40 hover:shadow-sm">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#025EB8]"><Icon className="h-4 w-4" /></span>
                <span><span className="block text-sm font-bold text-slate-800">{a.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{a.desc}</span></span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
