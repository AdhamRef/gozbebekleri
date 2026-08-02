import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Radio, Route, ScrollText, Activity, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSchedulerStatus } from "@/lib/communication/scheduler-status";
import { ProviderTestPanel } from "./_components/ProviderTestPanel";
import { PlatformConnectionsMovedNotice } from "@/components/dashboard/PlatformConnectionsMovedNotice";
import { getActiveCommunicationRuntimeBundle, getActiveMetaWebhookConfig } from "@/lib/communication/runtime-config";
import { safeCountValue } from "@/lib/dashboard/safe-count";

export const dynamic = "force-dynamic";

const advanced = [
  { label: "أرقام واتساب والمُرسِلون", href: "/dashboard/operations/communication/senders", icon: Radio, desc: "أرقام واتساب ومُرسِلو الإيميل والرسائل — دون أي مفاتيح." },
  { label: "قواعد اختيار رقم الإرسال", href: "/dashboard/operations/communication/routing", icon: Route, desc: "اختيار المُرسِل حسب اللغة والدولة والغرض." },
  { label: "سجل الرسائل", href: "/dashboard/operations/communication/delivery-logs", icon: ScrollText, desc: "أرشيف كل رسالة مُجهّزة أو مُرسَلة مع الحالة والسبب." },
  { label: "أحداث المزود", href: "/dashboard/operations/communication/provider-events", icon: Activity, desc: "أحداث التسليم والقراءة والفشل بنسختها الآمنة." },
];

export default async function CommunicationSettingsPage() {
  const [runtime, metaWebhook, scheduler, sendersWithNumber, lastEvent] = await Promise.all([
    getActiveCommunicationRuntimeBundle(),
    getActiveMetaWebhookConfig(),
    getSchedulerStatus(),
    process.env.DATABASE_URL ? safeCountValue("settings.whatsappSenders", () => prisma.communicationSender.count({ where: { channel: "WHATSAPP", enabled: true, phoneNumberId: { not: null } } })) : 0,
    process.env.DATABASE_URL ? prisma.communicationProviderEvent.findFirst({ where: { channel: "WHATSAPP" }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }).catch(() => null) : null,
  ]);
  const checklist = [
    { label: "رمز الوصول الفعّال مُعد", ok: runtime.meta.configured },
    { label: "مفتاح التطبيق الفعّال مُعد", ok: metaWebhook.configured },
    { label: "رمز تحقق Webhook الفعّال مُعد", ok: metaWebhook.configured },
    { label: "معرّف حساب الأعمال الفعّال مُعد", ok: runtime.meta.configured },
    { label: "رقم واتساب للإرسال", ok: sendersWithNumber > 0 || (runtime.meta.configured && !!runtime.meta.values.defaultPhoneNumberId) },
    { label: "تم استقبال حدث من المزود", ok: !!lastEvent?.receivedAt },
  ];
  const ready = checklist.filter((item) => item.ok).length;
  const providerCards = [
    { key: "META_WHATSAPP", label: "Meta WhatsApp", desc: "واتساب — المزود الوحيد", cfg: runtime.meta },
    { key: "ELASTIC_EMAIL", label: "Elastic Email", desc: "الإيميل — المزود الوحيد", cfg: runtime.elasticEmail },
    { key: "BREVO_SMS", label: "Brevo SMS", desc: "الرسائل القصيرة — الأرقام الدولية", cfg: runtime.brevoSms },
    { key: "NETGSM_SMS", label: "Netgsm SMS", desc: "الرسائل القصيرة — أرقام تركيا (+90)", cfg: runtime.netgsm },
  ];
  return (
    <main className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <PlatformConnectionsMovedNotice href="/dashboard/platform-connections/communication" label="فتح ربط المنصات والإرسال" text="الإعداد الرئيسي للمزودين موجود في ربط المنصات والإرسال." />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs text-slate-400">التواصل / إعدادات متقدمة</p><h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">إعدادات متقدمة للتواصل</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">الجاهزية هنا تعتمد على التكوين العامل المعتمد ثم إعدادات السيرفر كاحتياط.</p></div><Button asChild variant="outline" className="gap-2"><Link href="/dashboard/operations/communication">العودة <ArrowLeft className="h-4 w-4" /></Link></Button></div>
      <Card className="border-slate-200"><CardHeader className="pb-2"><CardTitle className="text-base">جاهزية واتساب</CardTitle><CardDescription>{ready}/{checklist.length} مكتمل.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{checklist.map((item) => <div key={item.label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">{item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}<span>{item.label}</span></div>)}</CardContent></Card>
      <section><h2 className="mb-1 text-sm font-bold text-slate-500">اختبار المزوّدين مباشرة</h2><p className="mb-3 text-xs leading-6 text-slate-400">إرسال رسالة اختبار واحدة عبر التكوين العامل فقط، مع أرشفتها في سجل الرسائل.</p><ProviderTestPanel webhookPath="/api/webhooks/meta/whatsapp" signatureConfigured={metaWebhook.configured} lastWebhookAt={lastEvent?.receivedAt?.toISOString() ?? null} emailReady={runtime.elasticEmail.configured} smsInternationalReady={runtime.brevoSms.configured} smsTurkeyReady={runtime.netgsm.configured} /></section>
      <Card className="border-slate-200"><CardHeader className="pb-2"><CardTitle className="text-base">جاهزية الجدولة</CardTitle><CardDescription>{scheduler.configured ? "الجدولة تعمل تلقائيًا." : "CRON_SECRET يحتاج ضبطًا داخل Vercel."}</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 text-sm"><div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">{scheduler.configured ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}<span>حماية Cron {scheduler.configured ? "مُفعّلة" : "غير مُفعّلة"}</span></div><div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2"><Clock className="h-4 w-4" /> آخر تشغيل: {scheduler.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleString("ar") : "لم يعمل بعد"}</div></CardContent></Card>
      <Card className="border-slate-200"><CardHeader className="pb-2"><CardTitle className="text-base">جاهزية مزوّدي الإرسال</CardTitle><CardDescription>لا يُستخدم Twilio ولا SendGrid ولا Brevo للبريد.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{providerCards.map((provider) => <div key={provider.key} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"><div className="flex items-center justify-between"><span className="font-bold">{provider.label}</span><span className={provider.cfg.configured ? "text-emerald-700" : "text-amber-700"}>{provider.cfg.configured ? "جاهز" : provider.cfg.reason ?? "يحتاج إعداد"}</span></div><p className="mt-0.5 text-xs text-slate-500">{provider.desc}</p></div>)}<div className="rounded-lg border bg-slate-100 px-3 py-2 text-xs text-slate-500 sm:col-span-2"><MessageSquare className="me-1 inline h-3.5 w-3.5" /> Twilio وSendGrid خارج مسارات الإرسال الفعلية.</div></CardContent></Card>
      <section><h2 className="mb-3 text-sm font-bold text-slate-500">أدوات متقدمة</h2><div className="grid gap-3 sm:grid-cols-2">{advanced.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex gap-3 rounded-xl border bg-white p-4"><Icon className="h-4 w-4 text-brand" /><span><b className="block text-sm">{item.label}</b><span className="text-xs text-slate-500">{item.desc}</span></span></Link>; })}</div></section>
    </main>
  );
}
