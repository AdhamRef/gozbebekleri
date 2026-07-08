import Link from "next/link";
import { Activity, ScrollText, RefreshCw, BarChart3 } from "lucide-react";
import { PageHeader, Card } from "../_components/ui";

export const metadata = { title: "السجلات المتقدمة | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

const LOGS = [
  { href: "/dashboard/operations/communication/provider-events", label: "أحداث المزود", desc: "أحداث التسليم والقراءة والفشل من مزودي التواصل — النسخة الآمنة فقط.", icon: <Activity className="h-4 w-4" /> },
  { href: "/dashboard/operations/communication/delivery-logs", label: "سجل الرسائل", desc: "أرشيف كل رسالة مُجهّزة أو مُرسَلة مع الحالة والسبب.", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/dashboard/marketing/sync-log", label: "سجل المزامنة", desc: "محاولات مزامنة الحسابات الإعلانية وحالتها وأخطاؤها.", icon: <RefreshCw className="h-4 w-4" /> },
  { href: "/dashboard/conversion-events", label: "أحداث التحويل", desc: "سجل أحداث التتبع والتحويل المرتبطة بالتبرعات.", icon: <BarChart3 className="h-4 w-4" /> },
];

export default function LogsPage() {
  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / السجلات المتقدمة"
        title="السجلات المتقدمة"
        subtitle="روابط للسجلات التفصيلية. مخصّصة للمراجعة المتقدمة فقط."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {LOGS.map((l) => (
          <Link key={l.href} href={l.href} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#025EB8]/50 hover:shadow">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#025EB8]">{l.icon}</span>
            <span>
              <span className="block text-sm font-bold text-slate-800">{l.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">{l.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
