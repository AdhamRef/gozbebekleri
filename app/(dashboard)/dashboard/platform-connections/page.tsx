import Link from "next/link";
import { Activity, MessageCircle, Radio, Mail, MessageSquare, Webhook, BarChart3, Megaphone, CheckCircle2 } from "lucide-react";
import { getOverview, STATUS_CLASS, STATUS_LABEL } from "@/lib/platform-connections/readiness";
import { PageHeader, PrimaryLink, GhostLink, StatusCard, QuickLink } from "./_components/ui";

export const metadata = { title: "ربط المنصات والإرسال | لوحة التحكم" };
export const dynamic = "force-dynamic";

const BASE = "/dashboard/platform-connections";

export default async function PlatformConnectionsOverview() {
  const { tracking, ads, comm, webhooks, issues } = await getOverview();

  return (
    <main className="space-y-6 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال"
        title="ربط المنصات والإرسال"
        subtitle="اربط بكسلات التتبع، الحسابات الإعلانية، ومزودي واتساب والإيميل والرسائل القصيرة من مكان واحد."
        backHref={null}
        actions={
          <>
            <PrimaryLink href={`${BASE}/health`}><Activity className="h-4 w-4" /> فحص كل الاتصالات</PrimaryLink>
            <GhostLink href="/dashboard/operations/communication"><MessageCircle className="h-4 w-4" /> فتح مركز التواصل</GhostLink>
          </>
        }
      />

      {/* 1. حالة عامة — 4 cards */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">حالة عامة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard title="بكسلات التتبع" status={tracking.status} actionHref={`${BASE}/tracking`} actionLabel="فتح الإعدادات" detail={`${tracking.configuredCount} من ${tracking.total} مُعدّة`} />
          <StatusCard title="الحسابات الإعلانية" status={ads.status} actionHref={`${BASE}/ad-accounts`} actionLabel="فتح الحسابات" detail={`${ads.connectedCount} حساب مربوط`} />
          <StatusCard title="مركز التواصل" status={comm.status} actionHref={`${BASE}/communication`} actionLabel="فتح التواصل" detail={`واتساب: ${STATUS_LABEL[comm.whatsapp.status]} · إيميل: ${STATUS_LABEL[comm.email.status]}`} />
          <StatusCard title="Webhooks" status={webhooks.status} lastCheck={webhooks.lastWebhookAt} actionHref={`${BASE}/webhooks`} actionLabel="فتح Webhooks" detail={webhooks.signatureConfigured ? "التوقيع مُفعّل" : "بدون توقيع"} />
        </div>
      </section>

      {/* 2. ما يحتاج تدخل الآن */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">ما يحتاج تدخل الآن</h2>
        {issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-800">كل الاتصالات جاهزة — لا يوجد ما يحتاج تدخلًا الآن.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold ${STATUS_CLASS[issue.severity]}`}>{STATUS_LABEL[issue.severity]}</span>
                  <span className="text-sm font-semibold text-slate-800">{issue.title}</span>
                </div>
                <Link href={issue.href} className="shrink-0 text-xs font-bold text-[#025EB8] hover:underline">{issue.action} ←</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. روابط سريعة */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">روابط سريعة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickLink href={`${BASE}/tracking`} label="إعداد بكسلات التتبع" icon={<BarChart3 className="h-4 w-4" />} />
          <QuickLink href={`${BASE}/ad-accounts`} label="ربط الحسابات الإعلانية" icon={<Megaphone className="h-4 w-4" />} />
          <QuickLink href={`${BASE}/communication`} label="إعداد واتساب" icon={<MessageCircle className="h-4 w-4" />} />
          <QuickLink href={`${BASE}/communication`} label="إعداد الإيميل" icon={<Mail className="h-4 w-4" />} />
          <QuickLink href={`${BASE}/communication`} label="إعداد الرسائل القصيرة" icon={<MessageSquare className="h-4 w-4" />} />
          <QuickLink href={`${BASE}/webhooks`} label="فحص Webhooks" icon={<Webhook className="h-4 w-4" />} />
        </div>
      </section>
    </main>
  );
}
