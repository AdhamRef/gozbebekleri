import Link from "next/link";
import { BarChart3, Bot, Database, Link2, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MARKETING_OPERATING_FLOW, MARKETING_TRUTH_SOURCES } from "@/lib/marketing/operating-flow";

const toolIcons = [PlugZap, Link2, ShieldCheck, BarChart3, Sparkles] as const;

const secondaryTools = [
  {
    title: "AI Assistant API",
    href: "/dashboard/marketing/ai-assistant",
    icon: Bot,
    description: "إضافة مفاتيح الذكاء الاصطناعي وتجهيز تحليل الحملات والتوصيات.",
    action: "فتح إعداد AI",
  },
  {
    title: "سحب البيانات",
    href: "/dashboard/marketing/data-sync",
    icon: Database,
    description: "تشغيل مزامنة Meta وGoogle وGA4 وTikTok وWhatsApp بفترات واضحة.",
    action: "فتح Data Sync",
  },
  {
    title: "Google Ads Deep Data",
    href: "/dashboard/marketing/google-ads",
    icon: BarChart3,
    description: "الكلمات، عبارات البحث، العناوين، الأصول، وروابط الهبوط.",
    action: "فتح Google Deep Data",
  },
];

export default function MarketingHomePage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">مركز التسويق والنمو</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">رحلة واحدة لإدارة الربط، الروابط، التحويلات، الأداء، والتوصيات. الهدف هنا ترتيب الأدوات الحالية حتى يعرف الفريق من أين يبدأ وماذا يفعل بعد ذلك.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>رحلة التشغيل الرسمية</CardTitle>
        <CardDescription>اتبع هذا الترتيب عند تشغيل أو مراجعة أي حملة. كل مرحلة تستخدم أدوات موجودة بالفعل.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-5">
        {MARKETING_OPERATING_FLOW.map((tool, index) => {
          const Icon = toolIcons[index] ?? PlugZap;
          return <Link key={tool.step} href={tool.href} className="block">
            <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{tool.step}</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
                </div>
                <CardTitle className="text-base">{tool.subtitle}</CardTitle>
                <CardDescription className="leading-6">{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">المصدر: {tool.source}</div>
                <span className="inline-flex rounded-md bg-[#025EB8] px-3 py-2 text-sm font-semibold text-white">{tool.action}</span>
              </CardContent>
            </Card>
          </Link>;
        })}
      </CardContent>
    </Card>

    <div className="grid gap-4 lg:grid-cols-3">
      {secondaryTools.map((tool) => {
        const Icon = tool.icon;
        return <Link key={tool.href} href={tool.href} className="block">
          <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
            <CardHeader>
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription className="leading-6">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent><span className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">{tool.action}</span></CardContent>
          </Card>
        </Link>;
      })}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>مصادر الحقيقة داخل نظام التسويق</CardTitle>
        <CardDescription>هذه القاعدة تمنع تكرار الجداول والداشبوردات عند ربط Operations وArchive لاحقًا.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-5">
        {MARKETING_TRUTH_SOURCES.map(([label, source]) => <div key={label} className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{source}</p>
        </div>)}
      </CardContent>
    </Card>
  </div>;
}
