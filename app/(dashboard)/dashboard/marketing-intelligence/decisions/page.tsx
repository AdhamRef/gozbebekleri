import Link from "next/link";
import { ArrowRight, BarChart3, GitCompareArrows, Settings, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { title: "توصيات الميزانية", href: "/dashboard/marketing-intelligence/budget-recommendations", icon: TrendingUp, desc: "قرارات زود، أوقف، خفّض، أصلح التتبع، أو راجع." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", icon: GitCompareArrows, desc: "مقارنة إنفاق المنصات وتحويلاتها بتبرعات الموقع الفعلية." },
  { title: "إعدادات التتبع", href: "/dashboard/pixels", icon: Settings, desc: "إعدادات Pixel وGA4 وGoogle Ads ومنصات التتبع." },
  { title: "ربط المنصات", href: "/dashboard/marketing/connections", icon: BarChart3, desc: "إدارة ربط المنصات ومفاتيح الاتصال والتكامل." },
];

export default function MarketingDecisionsHubPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div>
      <Link href="/dashboard/marketing-intelligence/executive-overview" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى لوحة التشغيل</Link>
      <h1 className="text-2xl font-black text-slate-950">القرارات والتوصيات</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">مركز اتخاذ القرار: مقارنة المنصات، توصيات الميزانية، وإعدادات الربط والتتبع.</p>
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
