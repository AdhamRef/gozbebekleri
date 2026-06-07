import Link from "next/link";
import { Bot, Database, PlugZap, Settings, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const platforms = [
  { title: "Meta Ads + Pixel", desc: "حساب الإعلانات، Pixel، Dataset، وCAPI.", href: "/dashboard/marketing/connections", tag: "إعلانات", status: "من صفحة الربط الحالية" },
  { title: "Google Ads", desc: "الحساب الإعلاني، OAuth، Developer Token، والتحويلات.", href: "/dashboard/marketing/connections", tag: "إعلانات", status: "يدعم Google Deep Data" },
  { title: "GA4", desc: "Measurement ID، API Secret، وProperty ID.", href: "/dashboard/pixels", tag: "تحليلات", status: "من إعدادات البكسلات" },
  { title: "TikTok Ads + Pixel", desc: "Advertiser ID، Access Token، Pixel، وEvents API.", href: "/dashboard/marketing/connections", tag: "إعلانات", status: "من صفحة الربط الحالية" },
  { title: "WhatsApp / Twilio", desc: "Account SID، Auth Token، وقنوات الرسائل.", href: "/dashboard/marketing/connections", tag: "رسائل", status: "من صفحة الربط الحالية" },
  { title: "AI Assistant API", desc: "Provider، API Key، Model، وBase URL.", href: "/dashboard/marketing/ai-assistant", tag: "AI", status: "فورم إعداد مباشر" },
];

export default function MarketingTrackingHubPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">الربط والـ APIs</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">صفحة مختصرة لاختيار ما تريد ربطه فقط. لا تفاصيل تقنية هنا؛ افتح المنصة المطلوبة وأضف بياناتها.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Summary title="المنصات" value="6" icon={<PlugZap className="h-5 w-5" />} />
      <Summary title="إعداد AI" value="مباشر" icon={<Bot className="h-5 w-5" />} />
      <Summary title="البكسلات" value="منفصلة" icon={<ShieldCheck className="h-5 w-5" />} />
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      {platforms.map((platform) => <Link key={platform.title} href={platform.href} className="block">
        <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Settings className="h-5 w-5" /></span>
              <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-600">{platform.tag}</span>
            </div>
            <CardTitle>{platform.title}</CardTitle>
            <CardDescription className="leading-6">{platform.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{platform.status}</div>
            <span className="inline-flex rounded-md bg-[#025EB8] px-3 py-2 text-sm font-semibold text-white">فتح الإعداد</span>
          </CardContent>
        </Card>
      </Link>)}
    </div>

    <Card>
      <CardHeader><CardTitle>بعد حفظ الربط</CardTitle><CardDescription>اتبع هذا التسلسل فقط.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Step title="1. اربط الحسابات" desc="أضف API/Pixel/Token من صفحة الربط المناسبة." />
        <Step title="2. اسحب البيانات" desc="شغل سحب البيانات للفترة المطلوبة." />
        <Step title="3. راجع التحليل" desc="افتح التوصيات وجودة التتبع." />
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>روابط سريعة</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing">نظام التسويق</Link><Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/data-sync">سحب البيانات</Link><Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/insights">التحليل والتوصيات</Link></CardContent></Card>
  </div>;
}

function Summary({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div></CardContent></Card>;
}

function Step({ title, desc }: { title: string; desc: string }) {
  return <div className="rounded-xl border bg-slate-50 p-4"><div className="flex items-center gap-2 font-bold text-slate-900"><Database className="h-4 w-4 text-[#025EB8]" />{title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p></div>;
}
