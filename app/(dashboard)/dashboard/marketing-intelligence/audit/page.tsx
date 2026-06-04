import Link from "next/link";
import { Activity, ArrowRight, Bug, CheckSquare, MonitorCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { title: "تدقيق قيمة التحويلات", href: "/dashboard/marketing-intelligence/conversion-value-audit", icon: Activity, desc: "فحص هل التحويلات أرسلت الإجمالي الكامل شامل دعم الفريق والرسوم." },
  { title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center", icon: Wrench, desc: "إعادة محاولة التحويلات الناقصة أو الفاشلة ومتابعة نتائج الإصلاح." },
  { title: "سجل التحويلات", href: "/dashboard/conversion-events", icon: Bug, desc: "عرض أحداث Meta / GA4 / Google Ads / Browser وسجلات النجاح والفشل." },
  { title: "اختبار النظام", href: "/dashboard/marketing-intelligence/test-checklist", icon: CheckSquare, desc: "قائمة اختبار شاملة للتأكد من سلامة التتبع والدفع والتحويلات." },
  { title: "حالة المنصات", href: "/dashboard/marketing-intelligence/platform-status", icon: MonitorCheck, desc: "حالة ربط المنصات والإعدادات الناقصة لكل منصة." },
];

export default function MarketingAuditHubPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div>
      <Link href="/dashboard/marketing-intelligence/executive-overview" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى لوحة التشغيل</Link>
      <h1 className="text-2xl font-black text-slate-950">التدقيق والإصلاح</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">كل أدوات فحص التحويلات، إصلاح الأخطاء، مراجعة السجلات، واختبار سلامة نظام التتبع.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <Link key={item.href} href={item.href} className="block">
        <Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><item.icon className="h-5 w-5 text-[#025EB8]" />{item.title}</CardTitle></CardHeader>
          <CardContent><CardDescription className="leading-6">{item.desc}</CardDescription></CardContent>
        </Card>
      </Link>)}
    </div>
  </div>;
}
