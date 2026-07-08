import Link from "next/link";
import { CheckCircle2, CircleAlert, XCircle, MinusCircle } from "lucide-react";
import { getOverview, STATUS_LABEL, type ConnStatus } from "@/lib/platform-connections/readiness";
import { PageHeader, Card, CardHeader } from "../_components/ui";

export const metadata = { title: "فحص الاتصال | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

const BASE = "/dashboard/platform-connections";

function CheckIcon({ status }: { status: ConnStatus }) {
  if (status === "READY") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "FAILED") return <XCircle className="h-5 w-5 text-rose-600" />;
  if (status === "DISABLED") return <MinusCircle className="h-5 w-5 text-slate-400" />;
  return <CircleAlert className="h-5 w-5 text-amber-500" />;
}

function CheckRow({ label, status, detail, href }: { label: string; status: ConnStatus; detail: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b p-4 last:border-0">
      <div className="flex items-center gap-3">
        <CheckIcon status={status} />
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500">{STATUS_LABEL[status]}</span>
        <Link href={href} className="text-xs font-bold text-[#025EB8] hover:underline">فتح</Link>
      </div>
    </div>
  );
}

export default async function HealthPage() {
  const { tracking, ads, comm, webhooks } = await getOverview();

  const checks = [
    { label: "جاهزية بكسلات التتبع", status: tracking.status, detail: `${tracking.configuredCount} من ${tracking.total} مُعدّة`, href: `${BASE}/tracking` },
    { label: "جاهزية مزامنة الحسابات الإعلانية", status: ads.status, detail: `${ads.connectedCount} حساب مربوط`, href: `${BASE}/ad-accounts` },
    { label: "جاهزية واتساب", status: comm.whatsapp.status, detail: `${comm.whatsapp.sendersWithNumber} رقم جاهز`, href: `${BASE}/communication` },
    { label: "جاهزية الإيميل", status: comm.email.status, detail: `${comm.email.enabledSenders} مُرسِل مفعّل`, href: `${BASE}/communication` },
    { label: "جاهزية الرسائل القصيرة", status: comm.sms.status, detail: "غير مفعّلة بعد", href: `${BASE}/communication` },
    { label: "تأمين Webhook", status: webhooks.signatureConfigured ? "READY" : ("NEEDS_SETUP" as ConnStatus), detail: webhooks.signatureConfigured ? "التوقيع مُفعّل" : "بدون توقيع", href: `${BASE}/webhooks` },
  ];

  const readyCount = checks.filter((c) => c.status === "READY").length;

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / فحص الاتصال"
        title="فحص الاتصال"
        subtitle="فحص مركزي لجاهزية كل الاتصالات. يُعاد الفحص تلقائيًا عند فتح الصفحة."
      />

      <Card>
        <CardHeader title="نتيجة الفحص" description={`${readyCount} من ${checks.length} جاهز.`} />
        <div>
          {checks.map((c) => (
            <CheckRow key={c.label} label={c.label} status={c.status} detail={c.detail} href={c.href} />
          ))}
        </div>
      </Card>

      <p className="max-w-2xl text-xs leading-6 text-slate-500">
        الفحص يعتمد على الإعدادات المحفوظة فعليًا فقط، دون إرسال أي رسالة أو حدث. لإجراء اختبار إرسال حقيقي واحد، استخدم أدوات الاختبار داخل
        <Link href="/dashboard/operations/communication/settings" className="mx-1 font-bold text-[#025EB8] hover:underline">إعدادات مركز التواصل</Link>.
      </p>
    </main>
  );
}
