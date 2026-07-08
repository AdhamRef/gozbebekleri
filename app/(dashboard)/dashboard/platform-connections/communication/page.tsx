import Link from "next/link";
import { MessageCircle, Mail, MessageSquare, Route, FlaskConical } from "lucide-react";
import { getCommunicationReadiness, STATUS_LABEL } from "@/lib/platform-connections/readiness";
import { PageHeader, Card, CardHeader, StatusBadge, EnvOnlyNote } from "../_components/ui";

export const metadata = { title: "مركز التواصل | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

const SETTINGS = "/dashboard/operations/communication/settings";
const SENDERS = "/dashboard/operations/communication/senders";
const ROUTING = "/dashboard/operations/communication/routing";

export default async function CommunicationConnectionsPage() {
  const c = await getCommunicationReadiness();

  const providers = [
    {
      key: "whatsapp",
      icon: <MessageCircle className="h-4 w-4 text-emerald-600" />,
      label: "واتساب (Meta WhatsApp Cloud API)",
      status: c.whatsapp.status,
      lines: [
        `أرقام جاهزة: ${c.whatsapp.sendersWithNumber}`,
        c.whatsapp.sendersMissingNumber > 0 ? `أرقام بلا مُعرّف: ${c.whatsapp.sendersMissingNumber}` : null,
      ].filter(Boolean) as string[],
      links: [{ href: SENDERS, label: "إدارة الأرقام" }, { href: SETTINGS, label: "الإعدادات والاختبار" }],
      envOnly: true,
    },
    {
      key: "email",
      icon: <Mail className="h-4 w-4 text-[#025EB8]" />,
      label: "الإيميل",
      status: c.email.status,
      lines: [`مُرسِلون مفعّلون: ${c.email.enabledSenders}`],
      links: [{ href: SENDERS, label: "إدارة المُرسِلين" }, { href: SETTINGS, label: "الإعدادات والاختبار" }],
      envOnly: true,
    },
    {
      key: "sms",
      icon: <MessageSquare className="h-4 w-4 text-amber-600" />,
      label: "الرسائل القصيرة",
      status: c.sms.status,
      lines: ["غير مفعّلة بعد — سيتم تفعيلها بعد ربط مزوّد الرسائل."],
      links: [{ href: SETTINGS, label: "التفاصيل" }],
      envOnly: false,
    },
  ];

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / مركز التواصل"
        title="مزودو التواصل والإرسال"
        subtitle="جاهزية واتساب والإيميل والرسائل القصيرة وقواعد اختيار المُرسِل. الإدارة الكاملة داخل مركز التواصل."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.key}>
            <CardHeader title={<span className="flex items-center gap-2">{p.icon} {p.label}</span>} />
            <div className="space-y-2 p-4 text-sm">
              <StatusBadge status={p.status} />
              <ul className="mt-1 space-y-1 text-xs text-slate-500">
                {p.lines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
              <div className="flex flex-wrap gap-3 pt-1 text-xs font-bold text-[#025EB8]">
                {p.links.map((l) => <Link key={l.href + l.label} href={l.href} className="hover:underline">{l.label}</Link>)}
              </div>
              {p.envOnly ? <EnvOnlyNote /> : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Route className="h-4 w-4 text-[#025EB8]" /> قواعد اختيار المُرسِل</span>} description="اختيار رقم/مُرسِل الإرسال حسب اللغة والدولة والغرض." />
          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-slate-600">قواعد مُعرّفة: <b className="text-slate-900">{c.routingRules}</b></span>
            <Link href={ROUTING} className="text-xs font-bold text-[#025EB8] hover:underline">فتح القواعد</Link>
          </div>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-[#025EB8]" /> أدوات اختبار المزودين</span>} description="إرسال رسالة اختبار واحدة لتأكيد الجاهزية — من داخل الإعدادات." />
          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-slate-600">الجدولة التلقائية: <b className="text-slate-900">{STATUS_LABEL[c.scheduler.configured ? "READY" : "NEEDS_SETUP"]}</b></span>
            <Link href={SETTINGS} className="text-xs font-bold text-[#025EB8] hover:underline">فتح أدوات الاختبار</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
