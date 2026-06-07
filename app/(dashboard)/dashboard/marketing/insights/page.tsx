import Link from "next/link";
import { Bot, Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  { title: "ملخص الأداء", icon: TrendingUp, desc: "الصرف، التبرعات، ROAS، وأهم الحملات." },
  { title: "توصيات AI", icon: Brain, desc: "اقتراحات زيادة، إيقاف، إصلاح تتبع، وتحسين رسائل." },
  { title: "تحليل Google", icon: Bot, desc: "الكلمات، عبارات البحث، العناوين، الأوصاف، والأصول." },
  { title: "تنبيهات حرجة", icon: AlertTriangle, desc: "صرف بدون نتائج، تتبع مكسور، أو حملات تحتاج تدخل." },
];

export default function MarketingInsightsPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">التحليل والتوصيات AI</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">هذه الصفحة ستكون مركز القرار: تحليل النتائج، قراءة بيانات المنصات، واستخدام AI Assistant لإخراج توصيات واضحة قابلة للتنفيذ.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => { const Icon = section.icon; return <Card key={section.title}><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#025EB8]" />{section.title}</CardTitle><CardDescription>{section.desc}</CardDescription></CardHeader><CardContent><div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">سيتم ربط هذا الجزء بمصادر البيانات والتحليل الذكي في الحزم التالية.</div></CardContent></Card>; })}
    </div>

    <Card><CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والتتبع</Link><Link href="/dashboard/marketing/data-sync" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">سحب البيانات</Link><Link href="/dashboard/ads" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الإعلانات التفصيلية</Link></CardContent></Card>
  </div>;
}
