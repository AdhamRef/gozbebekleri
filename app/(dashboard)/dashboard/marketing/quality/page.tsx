import Link from "next/link";
import { ShieldCheck, Wrench, GitCompareArrows, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  { title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center", icon: Wrench, desc: "إعادة فحص وإرسال التحويلات الناقصة أو الفاشلة." },
  { title: "سجل أحداث التحويل", href: "/dashboard/conversion-events", icon: ListChecks, desc: "عرض كل أحداث Meta / GA4 / Google / TikTok وحالتها." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", icon: GitCompareArrows, desc: "مقارنة تبرعات الموقع مع أرقام المنصات الإعلانية." },
  { title: "إعدادات البكسلات", href: "/dashboard/pixels", icon: ShieldCheck, desc: "إعداد Pixel IDs وCAPI وGA4 وGoogle Ads وTikTok." },
];

export default function MarketingQualityPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">جودة التتبع والإصلاح</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">منطقة الصيانة والتشخيص: إصلاح التبرعات، فحص أحداث التحويل، مقارنة الموقع بالمنصات، ومراجعة إعدادات البكسلات.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {tools.map((tool) => { const Icon = tool.icon; return <Link key={tool.href} href={tool.href}><Card className="h-full transition hover:border-blue-200 hover:shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#025EB8]" />{tool.title}</CardTitle><CardDescription>{tool.desc}</CardDescription></CardHeader><CardContent><div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">افتح الأداة فقط عند الحاجة للتشخيص أو الإصلاح.</div></CardContent></Card></Link>; })}
    </div>
  </div>;
}
