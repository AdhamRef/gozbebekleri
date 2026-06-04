import Link from "next/link";
import { ArrowRight, BarChart3, FileUp, Link2, Megaphone, TableProperties } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { title: "بيانات المنصات", href: "/dashboard/marketing-intelligence/platform-metrics", icon: TableProperties, desc: "عرض الإنفاق والنقرات والتحويلات والإيراد من المنصات." },
  { title: "استيراد بيانات المنصات", href: "/dashboard/marketing-intelligence/platform-metrics/import", icon: FileUp, desc: "استيراد CSV من Meta أو Google Ads أو TikTok أو GA4." },
  { title: "أداء الروابط", href: "/dashboard/marketing-intelligence/campaign-links", icon: BarChart3, desc: "تحليل روابط الحملات، التبرعات، التوصيات، والأرشفة." },
  { title: "إنشاء روابط تسويقية", href: "/dashboard/link-generator", icon: Link2, desc: "إنشاء روابط UTM وروابط حملات قابلة للتتبع." },
  { title: "الحملات والإعلانات", href: "/dashboard/ads", icon: Megaphone, desc: "إدارة الحملات والإعلانات القديمة أو المرتبطة بالنظام." },
];

export default function MarketingDataHubPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div>
      <Link href="/dashboard/marketing-intelligence/executive-overview" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى لوحة التشغيل</Link>
      <h1 className="text-2xl font-black text-slate-950">البيانات والروابط</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">كل ما يخص إدخال بيانات المنصات، استيراد التقارير، إنشاء الروابط، وتحليل أداء روابط الحملات.</p>
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
