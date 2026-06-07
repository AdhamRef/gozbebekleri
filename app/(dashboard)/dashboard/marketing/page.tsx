import Link from "next/link";
import { BarChart3, Bot, Database, PlugZap, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  {
    title: "الربط والـ APIs",
    href: "/dashboard/marketing/tracking-hub",
    icon: PlugZap,
    description: "ربط الحسابات الإعلانية، البكسلات، GA4، WhatsApp، وAI Assistant من مكان واحد.",
    action: "فتح الربط",
  },
  {
    title: "سحب البيانات",
    href: "/dashboard/marketing/data-sync",
    icon: Database,
    description: "تشغيل مزامنة Meta وGoogle وGA4 وTikTok وWhatsApp بفترات واضحة.",
    action: "سحب النتائج",
  },
  {
    title: "التحليل والتوصيات",
    href: "/dashboard/marketing/insights",
    icon: BarChart3,
    description: "قراءة الصرف والتبرعات وROAS والحملات، ثم تحويلها لتوصيات تشغيلية.",
    action: "عرض التوصيات",
  },
  {
    title: "جودة التتبع والإصلاح",
    href: "/dashboard/marketing/quality",
    icon: ShieldCheck,
    description: "فحص صحة التتبع، التحويلات الناقصة، وأدوات الإصلاح المتقدمة.",
    action: "فحص الجودة",
  },
];

export default function MarketingHomePage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">نظام التسويق</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">واجهة واحدة نظيفة لإدارة الربط، سحب البيانات، التحليل، وجودة التتبع. لا تفاصيل تقنية هنا؛ كل شيء في مكانه الصحيح.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-4">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return <Link key={tool.href} href={tool.href} className="block">
          <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
            <CardHeader>
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription className="leading-6">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent><span className="inline-flex rounded-md bg-[#025EB8] px-3 py-2 text-sm font-semibold text-white">{tool.action}</span></CardContent>
          </Card>
        </Link>;
      })}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#025EB8]" />AI Assistant API</CardTitle>
          <CardDescription>إضافة مفاتيح الذكاء الاصطناعي وتجهيز تحليل الحملات والتوصيات.</CardDescription>
        </CardHeader>
        <CardContent><Link href="/dashboard/marketing/ai-assistant" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح إعداد AI</Link></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Google Ads Deep Data</CardTitle>
          <CardDescription>الكلمات، عبارات البحث، العناوين، الأصول، وروابط الهبوط.</CardDescription>
        </CardHeader>
        <CardContent><Link href="/dashboard/marketing/google-ads" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح Google Deep Data</Link></CardContent>
      </Card>
    </div>
  </div>;
}
