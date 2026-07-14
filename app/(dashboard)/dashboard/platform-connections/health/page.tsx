import Link from "next/link";
import { getServerSession } from "next-auth";
import { CheckCircle2, CircleAlert, XCircle, MinusCircle } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { integrationActorFromSession } from "@/lib/integration-settings/http";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";
import { getOverview, STATUS_LABEL, type ConnStatus } from "@/lib/platform-connections/readiness";
import { uiStatus } from "@/lib/integration-settings/ui";
import { PageHeader, Card, CardHeader } from "../_components/ui";
import { RecheckConnectionsButton } from "./_components/RecheckConnectionsButton";

export const metadata = { title: "فحص الاتصال | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";
const BASE = "/dashboard/platform-connections";

function statusOf(value: ReturnType<typeof uiStatus>): ConnStatus {
  if (value === "READY" || value === "PENDING_ACTIVATION") return "READY";
  if (value === "DISABLED") return "DISABLED";
  if (value === "TEST_FAILED" || value === "ENCRYPTION_ERROR") return "FAILED";
  return "NEEDS_SETUP";
}
function CheckIcon({ status }: { status: ConnStatus }) {
  if (status === "READY") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "FAILED") return <XCircle className="h-5 w-5 text-rose-600" />;
  if (status === "DISABLED") return <MinusCircle className="h-5 w-5 text-slate-400" />;
  return <CircleAlert className="h-5 w-5 text-amber-500" />;
}
function CheckRow({ label, status, detail, lastTest, href }: { label: string; status: ConnStatus; detail: string; lastTest?: string | null; href: string }) {
  return <div className="flex flex-col gap-3 border-b p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckIcon status={status} /><div><p className="text-sm font-bold text-slate-800">{label}</p><p className="text-xs text-slate-500">{detail}</p>{lastTest ? <p className="mt-1 text-[11px] text-slate-400">آخر اختبار محفوظ: {new Date(lastTest).toLocaleString("ar")}</p> : null}</div></div><div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500">{STATUS_LABEL[status]}</span><Link href={href} className="text-xs font-bold text-[#025EB8] hover:underline">فتح</Link></div></div>;
}

export default async function HealthPage() {
  const session = await getServerSession(authOptions);
  const actor = integrationActorFromSession(session!);
  const [{ webhooks }, meta, brevo, netgsm, cron] = await Promise.all([
    getOverview(),
    integrationSettingsService.getProviderSnapshot("META_WHATSAPP", actor),
    integrationSettingsService.getProviderSnapshot("BREVO", actor),
    integrationSettingsService.getProviderSnapshot("NETGSM", actor),
    integrationSettingsService.getProviderSnapshot("SYSTEM", actor),
  ]);
  const checks = [
    { label: "Meta WhatsApp", status: statusOf(uiStatus(meta)), detail: meta.candidate.lastFailureReasonSafe || "آخر حالة محفوظة لاتصال Meta وواتساب.", lastTest: meta.candidate.lastTestAt, href: `${BASE}/communication` },
    { label: "Brevo Email", status: statusOf(uiStatus(brevo)), detail: "حالة الحساب وبريد المرسل دون إرسال رسالة.", lastTest: brevo.candidate.lastTestAt, href: `${BASE}/communication` },
    { label: "Brevo SMS", status: statusOf(uiStatus(brevo)), detail: "حالة اتصال SMS الدولي وإعداد المرسل دون إرسال.", lastTest: brevo.candidate.lastTestAt, href: `${BASE}/communication` },
    { label: "Netgsm SMS", status: statusOf(uiStatus(netgsm)), detail: netgsm.candidate.lastFailureReasonSafe || "حالة حساب Netgsm واسم المرسل لتركيا.", lastTest: netgsm.candidate.lastTestAt, href: `${BASE}/communication` },
    { label: "Cron", status: statusOf(uiStatus(cron)), detail: "حالة مفتاح حماية الجدولة وآخر اختبار محفوظ.", lastTest: cron.candidate.lastTestAt, href: `${BASE}/communication` },
    { label: "Webhooks", status: webhooks.signatureConfigured ? "READY" as ConnStatus : "NEEDS_SETUP" as ConnStatus, detail: webhooks.signatureConfigured ? "توقيع Webhook مُفعّل." : "توقيع Webhook يحتاج إعدادًا.", lastTest: webhooks.lastWebhookAt, href: `${BASE}/webhooks` },
  ];
  const readyCount = checks.filter((item) => item.status === "READY").length;
  const canTest = userHasDashboardPermission(session?.user, "platformConnectionsTest");

  return <main className="space-y-5 p-4 sm:p-6" dir="rtl"><PageHeader eyebrow="ربط المنصات والإرسال / فحص الاتصال" title="فحص الاتصال" subtitle="يعرض آخر نتائج الاختبارات المحفوظة. لا يتم الاتصال بالمزودين تلقائيًا عند فتح الصفحة." actions={canTest ? <RecheckConnectionsButton providers={["META_WHATSAPP", "BREVO", "NETGSM", "SYSTEM"]} /> : undefined} /><Card><CardHeader title="نتيجة الفحص" description={`${readyCount} من ${checks.length} جاهز.`} /><div>{checks.map((item) => <CheckRow key={item.label} {...item} />)}</div></Card><p className="max-w-2xl text-xs leading-6 text-slate-500">إعادة الفحص تتصل بالمزودين بعد تأكيد المستخدم، ولا ترسل رسائل واتساب أو بريدًا أو SMS.</p></main>;
}
