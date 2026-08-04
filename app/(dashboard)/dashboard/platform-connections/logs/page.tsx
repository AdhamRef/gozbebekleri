import Link from "next/link";
import { ScrollText, RefreshCw, BarChart3 } from "lucide-react";
import { PageHeader, Card } from "../_components/ui";

export const metadata = { title: "السجلات المتقدمة | ربط المنصات والإرسال" };
export const dynamic = "force-dynamic";

// «أحداث المزود» pointed into /dashboard/operations, removed with التشغيل, and has no
// surviving equivalent — listing a card that 404s is worse than not listing it. «سجل الرسائل»
// does survive, at /dashboard/messages.
const LOGS = [
  { href: "/dashboard/messages", label: "سجل الرسائل", desc: "أرشيف كل رسالة مُجهّزة أو مُرسَلة مع الحالة والسبب.", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/dashboard/marketing/sync-log", label: "سجل المزامنة", desc: "محاولات مزامنة الحسابات الإعلانية وحالتها وأخطاؤها.", icon: <RefreshCw className="h-4 w-4" /> },
  { href: "/dashboard/conversion-events", label: "أحداث التحويل", desc: "سجل أحداث التتبع والتحويل المرتبطة بالتبرعات.", icon: <BarChart3 className="h-4 w-4" /> },
];

export default function LogsPage() {
  return (
    <main className="space-y-5" dir="rtl">
      <PageHeader
        eyebrow="ربط المنصات والإرسال / السجلات المتقدمة"
        title="السجلات المتقدمة"
        subtitle="روابط للسجلات التفصيلية. مخصّصة للمراجعة المتقدمة فقط."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {LOGS.map((l) => (
          <Link key={l.href} href={l.href} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/50 hover:shadow">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand">{l.icon}</span>
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
