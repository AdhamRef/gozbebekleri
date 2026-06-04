import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Database, GitCompareArrows, Map, Rocket, Settings, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const mainSections = [
  { title: "لوحة التشغيل", href: "/dashboard/marketing-intelligence/executive-overview", icon: Activity, desc: "ملخص صحة النظام، أهم الإجراءات، فجوات المنصات، وتوصيات الميزانية.", badge: "الأهم يوميًا" },
  { title: "الفحص النهائي", href: "/dashboard/marketing-intelligence/final-readiness", icon: ShieldCheck, desc: "تشخيص نهائي لجاهزية النظام بعد الـ deploy قبل الانتقال لقسم آخر.", badge: "تسليم نهائي" },
  { title: "جاهزية الإطلاق", href: "/dashboard/marketing-intelligence/launch-readiness", icon: Rocket, desc: "Checklist نهائية قبل إطلاق أو توسيع حملات إعلانية كبيرة.", badge: "قبل الإطلاق" },
  { title: "مركز الإجراءات", href: "/dashboard/marketing-intelligence/action-items", icon: ClipboardList, desc: "قائمة تنفيذ تجمع المشاكل العاجلة والمتوسطة من كل أجزاء النظام.", badge: "مهام الفريق" },
  { title: "البيانات والروابط", href: "/dashboard/marketing-intelligence/data", icon: Database, desc: "استيراد بيانات المنصات، إنشاء الروابط، وتحليل أداء الروابط.", badge: "إدخال وتحليل" },
  { title: "التدقيق والإصلاح", href: "/dashboard/marketing-intelligence/audit", icon: ShieldCheck, desc: "فحص قيمة التحويلات، إصلاح الناقص، سجل الأحداث، واختبار النظام.", badge: "جودة التتبع" },
  { title: "القرارات والتوصيات", href: "/dashboard/marketing-intelligence/decisions", icon: TrendingUp, desc: "توصيات الميزانية ومقارنة الموقع ضد المنصات لاتخاذ قرارات واضحة.", badge: "قرارات الميزانية" },
  { title: "خريطة النظام", href: "/dashboard/marketing-intelligence/system-map", icon: Map, desc: "صورة كاملة لمسارات التتبع والبيكسلات والتحويلات.", badge: "فهم البنية" },
];

const quickLinks = [
  { title: "الفحص النهائي", href: "/dashboard/marketing-intelligence/final-readiness", icon: ShieldCheck },
  { title: "جاهزية الإطلاق", href: "/dashboard/marketing-intelligence/launch-readiness", icon: Rocket },
  { title: "استيراد بيانات المنصات", href: "/dashboard/marketing-intelligence/platform-metrics/import", icon: Database },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", icon: GitCompareArrows },
  { title: "توصيات الميزانية", href: "/dashboard/marketing-intelligence/budget-recommendations", icon: TrendingUp },
  { title: "تدقيق قيمة التحويلات", href: "/dashboard/marketing-intelligence/conversion-value-audit", icon: CheckCircle2 },
  { title: "إعدادات التتبع", href: "/dashboard/pixels", icon: Settings },
  { title: "أداء الروابط", href: "/dashboard/marketing-intelligence/campaign-links", icon: BarChart3 },
];

export default function MarketingIntelligencePage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <div className="max-w-4xl">
        <p className="text-sm text-white/75">نظام التتبع والإعلانات</p>
        <h1 className="mt-2 text-3xl font-black">مركز التسويق الذكي</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">بوابة واحدة لإدارة بيانات المنصات، الروابط، التحويلات، التدقيق، المقارنة، وتوصيات الميزانية.</p>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {mainSections.map((section) => <Link key={section.href} href={section.href} className="block">
        <Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-md">
          <CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="flex items-center gap-2 text-lg"><section.icon className="h-5 w-5 text-[#025EB8]" />{section.title}</CardTitle><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{section.badge}</span></div></CardHeader>
          <CardContent className="space-y-4"><CardDescription className="min-h-[3rem] leading-6">{section.desc}</CardDescription><div className="inline-flex items-center gap-2 text-sm font-medium text-[#025EB8]">فتح القسم <ArrowLeft className="h-4 w-4" /></div></CardContent>
        </Card>
      </Link>)}
    </div>
    <Card><CardHeader><CardTitle>روابط سريعة</CardTitle><CardDescription>اختصارات للمهام الأكثر استخدامًا داخل النظام.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {quickLinks.map((link) => <Link key={link.href} href={link.href} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm transition hover:border-[#025EB8]/40 hover:bg-slate-50"><span className="flex items-center gap-2 font-medium text-slate-800"><link.icon className="h-4 w-4 text-[#025EB8]" />{link.title}</span><ArrowLeft className="h-4 w-4 text-slate-400" /></Link>)}
    </div></CardContent></Card>
  </div>;
}
