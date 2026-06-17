import Link from "next/link";
import { Archive, ArrowLeft, Bot, ImageIcon, Search, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiContext } from "@/lib/ai/core/ai-core-service";

export const metadata = {
  title: "مساعد الأرشيف AI | لوحة التحكم",
};

export default function ArchiveAiAssistantPage() {
  const context = getAiContext("archive");

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Shared AI Core / Archive Context</p>
        <h1 className="mt-1.5 text-2xl font-black">مساعد الأرشيف AI</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          طبقة آمنة لتجهيز مساعد يبحث في الأرشيف ويقترح مواد قابلة لإعادة الاستخدام دون حذف أو نشر أو تعديل ملفات.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#025EB8]" /> {context?.title}</CardTitle>
            <CardDescription>{context?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-black text-slate-900">القدرات</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {context?.capabilities.map((capability) => <Badge key={capability} variant="secondary">{capability}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">الأفعال المحظورة</p>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {context?.blockedActions.map((action) => <p key={action}>• {action}</p>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سيناريوهات الاستخدام</CardTitle>
            <CardDescription>جاهز لاحقًا للبحث الذكي داخل الصور والفيديوهات والتصاميم.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Feature icon={<Search className="h-4 w-4" />} title="بحث ذكي" text="اعثر على أفضل مواد غزة، الوقف، الزكاة أو الشتاء حسب الموسم." />
            <Feature icon={<Tags className="h-4 w-4" />} title="تصنيف الأصول" text="اقتراح tags ولغات ومشاريع مرتبطة لكل أصل." />
            <Feature icon={<ImageIcon className="h-4 w-4" />} title="إعادة الاستخدام" text="اقتراح مواد جاهزة للتسويق من الأرشيف." />
            <Feature icon={<Archive className="h-4 w-4" />} title="أمان الأرشيف" text="لا حذف ولا تعديل ملفات ولا نشر تلقائي." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <QuickLink href="/dashboard/operations/archive" title="الأرشيف" />
          <QuickLink href="/dashboard/operations/command-center" title="مركز قيادة المحتوى" />
          <QuickLink href="/dashboard/brand" title="Brand Center" />
        </CardContent>
      </Card>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border bg-slate-50 p-4"><span className="text-[#025EB8]">{icon}</span><h2 className="mt-2 font-black text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>;
}

function QuickLink({ href, title }: { href: string; title: string }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-slate-50">{title}<ArrowLeft className="h-3.5 w-3.5" /></Link>;
}
