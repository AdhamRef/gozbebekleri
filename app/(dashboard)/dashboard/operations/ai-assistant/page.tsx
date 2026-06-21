import Link from "next/link";
import { ArrowLeft, Bot, CalendarDays, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiAssistantReadiness } from "@/lib/ai/core/ai-core-service";

export const metadata = {
  title: "مساعد المحتوى AI | لوحة التحكم",
};

export default function ContentAiAssistantPage() {
  const readiness = getAiAssistantReadiness("content");
  const context = readiness?.context;

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Shared AI Core / Content Context</p>
        <h1 className="mt-1.5 text-2xl font-black">مساعد المحتوى AI</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          نسخة آمنة لمساعد المحتوى. لا تستدعي مزود AI خارجي إلا إذا كانت مفاتيح السيرفر مفعلة صراحة، وتحدد الصلاحيات والمصادر قبل أي استخدام حقيقي.
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
              <p className="text-sm font-black text-slate-900">ما يستطيع قراءته</p>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {readiness?.tools.map((tool) => <p key={tool.name}>• {tool.name}: {tool.dataSource}</p>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">ما لا يستطيع فعله</p>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {readiness?.humanApprovalRules.map((rule) => <p key={rule.key}>• {rule.action}</p>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ما الذي سيفعله عند الربط؟</CardTitle>
            <CardDescription>تجهيز سياق المحتوى قبل توصيل OpenAI API الحقيقي.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Feature icon={<CalendarDays className="h-4 w-4" />} title="خطط المواسم" text="اقتراح خطة رمضان، الجمعة، ذي الحجة، غزة، الوقف والزكاة." />
            <Feature icon={<FileText className="h-4 w-4" />} title="نصوص المحتوى" text="اقتراح نصوص فيديو، بوست، كاروسيل، واتساب، إيميل وSMS." />
            <Feature icon={<Sparkles className="h-4 w-4" />} title="أولويات التنفيذ" text="اقتراح ما يجب إنتاجه وتسليمه للتسويق أولًا." />
            <Feature icon={<CheckCircle2 className="h-4 w-4" />} title="مراجعة آمنة" text="لا نشر تلقائي ولا إرسال رسائل بدون مراجعة بشرية." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompts مفيدة</CardTitle>
          <CardDescription>استخدمه كمساعد تشغيل بسياق المحتوى، وليس كشات عام.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {readiness?.promptExamples.map((prompt) => (
            <div key={prompt} className="rounded-2xl border bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">{prompt}</div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <QuickLink href="/dashboard/operations/command-center" title="مركز قيادة المحتوى" />
          <QuickLink href="/dashboard/operations/calendar" title="التقويم والتنبيهات" />
          <QuickLink href="/dashboard/operations/production" title="لوحة الإنتاج" />
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
