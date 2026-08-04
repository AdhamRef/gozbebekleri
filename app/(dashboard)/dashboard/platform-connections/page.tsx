import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Activity, MessageCircle, Webhook, BarChart3, Megaphone, CheckCircle2 } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { getOverview, STATUS_CLASS, STATUS_LABEL, type ConnStatus } from "@/lib/platform-connections/readiness";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";
import { integrationActorFromSession } from "@/lib/integration-settings/http";
import { getSchedulerStatus } from "@/lib/communication/scheduler-status";
import { PageHeader, PrimaryLink, StatusCard, QuickLink } from "./_components/ui";

export const metadata = { title: "ربط المنصات والإرسال | لوحة التحكم" };
export const dynamic = "force-dynamic";
const BASE = "/dashboard/platform-connections";

function activeStatus(snapshot: Awaited<ReturnType<typeof integrationSettingsService.getProviderSnapshot>>): ConnStatus {
  if (!snapshot.enabled) return "DISABLED";
  if (snapshot.status === "ERROR") return "FAILED";
  return snapshot.status === "READY" ? "READY" : "NEEDS_SETUP";
}

/** SMS spans two providers (Netgsm for TR, Brevo for the rest); surface the worst of the two. */
function mergeStatus(...statuses: ConnStatus[]): ConnStatus {
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.includes("NEEDS_SETUP")) return "NEEDS_SETUP";
  return statuses.every((status) => status === "DISABLED") ? "DISABLED" : "READY";
}

export default async function PlatformConnectionsOverview() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "platformConnections");
  if (!access.allowed) redirect(access.redirectTo);
  const actor = integrationActorFromSession(access.session);
  const [{ tracking, ads, webhooks, issues }, scheduler, meta, elasticEmail, brevo, netgsm] = await Promise.all([
    getOverview(),
    getSchedulerStatus(),
    integrationSettingsService.getProviderSnapshot("META_WHATSAPP", actor),
    integrationSettingsService.getProviderSnapshot("ELASTIC_EMAIL", actor),
    integrationSettingsService.getProviderSnapshot("BREVO", actor),
    integrationSettingsService.getProviderSnapshot("NETGSM", actor),
  ]);
  const adsNeedSetup = ads.rows.filter((row) => row.status === "NEEDS_SETUP").length;
  const smsStatus = mergeStatus(activeStatus(brevo), activeStatus(netgsm));
  const communicationStatuses = [activeStatus(meta), activeStatus(elasticEmail), smsStatus, scheduler.configured ? "READY" as ConnStatus : "NEEDS_SETUP" as ConnStatus];
  const communicationStatus: ConnStatus = communicationStatuses.includes("FAILED") ? "FAILED" : communicationStatuses.includes("NEEDS_SETUP") ? "NEEDS_SETUP" : communicationStatuses.every((status) => status === "DISABLED") ? "DISABLED" : "READY";

  return <main className="space-y-6 p-4 sm:p-6" dir="rtl">
    <PageHeader title="ربط المنصات والإرسال" subtitle="إعداد الحسابات الإعلانية، المزامنة، بكسلات التتبع، مزودي الإرسال، والـWebhooks من مكان واحد." backHref={null} actions={<PrimaryLink href={`${BASE}/health`}><Activity className="h-4 w-4" /> فحص الإعدادات</PrimaryLink>} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatusCard title="بكسلات التتبع" status={tracking.status} actionHref={`${BASE}/tracking`} actionLabel="فتح الإعدادات" detail={<p>{`${tracking.configuredCount} من ${tracking.total} منصة مُعدّة`}</p>} />
      <StatusCard title="الحسابات والمزامنة" status={ads.status} actionHref={`${BASE}/ad-accounts`} actionLabel="فتح الحسابات" detail={<><p>{`${ads.connectedCount} حساب مربوط`}</p><p>{`${adsNeedSetup} يحتاج إعداد`}</p></>} />
      <StatusCard title="مزودو التواصل والإرسال" status={communicationStatus} actionHref={`${BASE}/communication`} actionLabel="فتح المزودين" detail={<><p>واتساب: {STATUS_LABEL[activeStatus(meta)]}</p><p>الإيميل: {STATUS_LABEL[activeStatus(elasticEmail)]}</p><p>SMS: {STATUS_LABEL[smsStatus]}</p><p>Cron: {scheduler.configured ? "مُفعّل" : "يحتاج إعداد"}</p></>} />
      <StatusCard title="Webhooks وCron" status={webhooks.status} lastCheck={webhooks.lastWebhookAt} actionHref={`${BASE}/webhooks`} actionLabel="فتح Webhooks" detail={<><p>التوقيع: {webhooks.signatureConfigured ? "مُفعّل" : "غير مفعّل"}</p><p>Cron: {scheduler.configured ? "مُفعّل" : "يحتاج إعداد"}</p></>} />
    </section>
    <section><h2 className="mb-3 text-sm font-bold text-slate-500">ما يحتاج إعداد الآن</h2>{issues.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center"><CheckCircle2 className="h-7 w-7 text-emerald-600" /><p className="text-sm font-bold text-emerald-800">كل الإعدادات الأساسية جاهزة.</p></div> : <ul className="space-y-2">{issues.map((issue, index) => <li key={index} className="flex items-center justify-between gap-3 rounded-xl border p-3.5"><div className="flex items-center gap-3"><span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${STATUS_CLASS[issue.severity]}`}>{STATUS_LABEL[issue.severity]}</span><span className="text-sm font-semibold">{issue.title}</span></div><Link href={issue.href} className="text-xs font-bold text-brand">{issue.action} ←</Link></li>)}</ul>}</section>
    <section><h2 className="mb-3 text-sm font-bold text-slate-500">روابط الإعداد</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><QuickLink href={`${BASE}/tracking`} label="إعداد بكسلات التتبع" icon={<BarChart3 className="h-4 w-4" />} /><QuickLink href={`${BASE}/ad-accounts`} label="الحسابات وحالة المزامنة" icon={<Megaphone className="h-4 w-4" />} /><QuickLink href={`${BASE}/communication`} label="واتساب والإيميل وSMS" icon={<MessageCircle className="h-4 w-4" />} /><QuickLink href={`${BASE}/webhooks`} label="Webhooks" icon={<Webhook className="h-4 w-4" />} /><QuickLink href={`${BASE}/health`} label="فحص الاتصال" icon={<Activity className="h-4 w-4" />} /></div></section>
  </main>;
}
