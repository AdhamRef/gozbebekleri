import Link from "next/link";
import { CalendarDays, Database, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const periods = ["اليوم", "7 أيام", "14 يوم", "30 يوم", "Custom"];

const platforms = [
  { title: "Meta", details: "الحملات، المجموعات، الإعلانات، الصرف، النقرات، والتحويلات." },
  { title: "Google Ads", details: "الحملات، الكلمات، عبارات البحث، العناوين، الأوصاف، الأصول، والصرف." },
  { title: "GA4", details: "الجلسات، المصادر، الصفحات، الأحداث، الدول، والأجهزة." },
  { title: "TikTok", details: "الحملات، المجموعات، الإعلانات، الصرف، النقرات، والتحويلات." },
  { title: "WhatsApp / Twilio", details: "الرسائل، القوالب، التسليم، الفشل، وروابط التتبع." },
];

export default function MarketingDataSyncPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">سحب البيانات</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">مركز موحد لسحب بيانات الحملات والنتائج من الحسابات الإعلانية. التشغيل المباشر للمزامنة سيضاف في الخطوة التالية فوق هذه الصفحة.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#025EB8]" />فترات العمل</CardTitle>
        <CardDescription>كل أدوات التسويق ستستخدم نفس الفترات حتى يكون النظام موحدًا وسهلًا.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {periods.map((period) => <span key={period} className="rounded-full border bg-slate-50 px-4 py-2 text-sm text-slate-700">{period}</span>)}
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      {platforms.map((platform) => <Card key={platform.title}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-[#025EB8]" />{platform.title}</CardTitle>
          <CardDescription>{platform.details}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">سيظهر هنا آخر سحب، عدد الصفوف، الصرف، والحالة.</div>
        </CardContent>
      </Card>)}
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-[#025EB8]" />Google Ads Deep Data</CardTitle>
        <CardDescription>سيكون لجوجل اهتمام خاص بسبب الكلمات وعبارات البحث والعناوين والأوصاف والأصول.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {['Keywords', 'Search Terms', 'Headlines & Descriptions', 'Assets & Final URLs'].map((item) => <div key={item} className="rounded-xl border bg-white p-3 text-sm font-semibold text-slate-800">{item}</div>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والتتبع</Link>
        <Link href="/dashboard/marketing/insights" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">التحليل والتوصيات</Link>
        <Link href="/dashboard/marketing/quality" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">جودة التتبع والإصلاح</Link>
      </CardContent>
    </Card>
  </div>;
}
