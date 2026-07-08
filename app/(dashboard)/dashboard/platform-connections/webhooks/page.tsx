import Link from "next/link";
import { getWebhooksReadiness } from "@/lib/platform-connections/readiness";
import { PageHeader, Card, CardHeader, StatusBadge, fmtDate } from "../_components/ui";
import { CopyButton } from "../_components/CopyButton";

export const metadata = { title: "Webhooks | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

const SETTINGS = "/dashboard/operations/communication/settings";
const PROVIDER_EVENTS = "/dashboard/operations/communication/provider-events";

function Info({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${ok === undefined ? "text-slate-800" : ok ? "text-emerald-700" : "text-amber-700"}`}>{value}</div>
    </div>
  );
}

export default async function WebhooksPage() {
  const w = await getWebhooksReadiness();

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / Webhooks"
        title="Webhooks"
        subtitle="رابط استقبال أحداث واتساب وحالة التأمين والجدولة التلقائية. لا تُعرض بيانات الأحداث الخام هنا."
      />

      <Card>
        <CardHeader title="رابط استقبال أحداث واتساب" description="أدخل هذا الرابط في إعدادات Meta Webhook." action={<StatusBadge status={w.status} />} />
        <div className="space-y-4 p-4">
          <CopyButton value={w.webhookPath} />
          <div className="grid gap-2 sm:grid-cols-3">
            <Info label="التحقق بالتوقيع" value={w.signatureConfigured ? "مُفعّل" : "غير مُفعّل"} ok={w.signatureConfigured} />
            <Info label="آمن للإنتاج" value={w.signatureConfigured ? "نعم" : "يحتاج رمزًا سريًا"} ok={w.signatureConfigured} />
            <Info label="آخر حدث مستلم" value={fmtDate(w.lastWebhookAt)} ok={!!w.lastWebhookAt} />
          </div>
          {!w.signatureConfigured ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              التحقق بالتوقيع غير مُفعّل. في بيئة الإنتاج تُرفض الأحداث غير الموثّقة تلقائيًا حتى يُضبط الرمز السري من إعدادات السيرفر.
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="الجدولة التلقائية (Cron)" description="تنفيذ الحملات المجدولة عند حلول موعدها." />
        <div className="grid gap-2 p-4 sm:grid-cols-3">
          <Info label="التنفيذ التلقائي" value={w.scheduler.configured ? "مُفعّل" : "غير مُفعّل"} ok={w.scheduler.configured} />
          <Info label="آخر تشغيل" value={fmtDate(w.scheduler.lastRunAt)} ok={!!w.scheduler.lastRunAt} />
          <Info label="مستحقة الآن" value={String(w.scheduler.dueCount)} ok={w.scheduler.dueCount === 0} />
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href={SETTINGS} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]">أدوات اختبار Webhook</Link>
        <Link href={PROVIDER_EVENTS} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-[#025EB8] hover:text-[#025EB8]">عرض أحداث المزود (متقدم)</Link>
      </div>
    </main>
  );
}
