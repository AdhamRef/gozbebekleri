import Link from "next/link";
import { Bot, CheckCircle2, HelpCircle, PlugZap, ShieldCheck } from "lucide-react";
import { MARKETING_PLATFORM_CAPABILITIES } from "@/lib/marketing/platform-capabilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const categoryLabel: Record<string, string> = {
  ads: "إعلانات",
  analytics: "تحليلات",
  messaging: "رسائل",
  tracking: "تتبع",
  ai: "ذكاء اصطناعي",
};

function isPriorityPlatform(key: string) {
  return key === "meta" || key === "google_ads" || key === "ai_assistant";
}

export default function MarketingTrackingHubPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">الربط والتتبع</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">مركز واحد لربط الحسابات الإعلانية، البكسلات، CAPI، GA4، WhatsApp، وواجهة AI Assistant. التفاصيل موجودة عند الحاجة فقط حتى تبقى الواجهة نظيفة.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <SummaryCard title="منصات الربط" value="6" desc="Meta, Google, GA4, TikTok, WhatsApp, AI" icon={<PlugZap className="h-5 w-5" />} />
      <SummaryCard title="شرح الحقول" value="جاهز" desc="كل حقل له شرح: من أين نجيبه وما فائدته" icon={<HelpCircle className="h-5 w-5" />} />
      <SummaryCard title="AI Assistant API" value="ضمن النظام" desc="Provider, API Key, Model, Base URL" icon={<Bot className="h-5 w-5" />} />
    </div>

    <Card>
      <CardHeader>
        <CardTitle>طريقة استخدام الصفحة</CardTitle>
        <CardDescription>لا تحتاج لقراءة كل التفاصيل. افتح فقط المنصة التي تريد ربطها أو إصلاحها.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Instruction text="ابدأ بالمنصة التي تريد تفعيلها مثل Meta أو Google Ads." />
        <Instruction text="افتح حقول الربط واقرأ علامة السؤال بجانب كل قيمة." />
        <Instruction text="بعد حفظ الإعدادات من أدوات الربط الحالية، انتقل إلى سحب البيانات." />
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      {MARKETING_PLATFORM_CAPABILITIES.map((platform) => (
        <Card key={platform.key} className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{platform.title}</CardTitle>
                <CardDescription className="mt-1 leading-6">{platform.description}</CardDescription>
              </div>
              <span className="rounded-full border bg-white px-3 py-1 text-xs text-slate-600">{categoryLabel[platform.category] ?? platform.category}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-2 md:grid-cols-3">
              <MiniStat label="حقول مطلوبة" value={String(platform.connectionFields.filter((field) => field.required).length)} />
              <MiniStat label="حقول سرية" value={String(platform.connectionFields.filter((field) => field.secret).length)} />
              <MiniStat label="نقاط السحب" value={String(platform.canPull.length)} />
            </div>

            {platform.key === "ai_assistant" ? <Link className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/ai-assistant">فتح إعدادات AI Assistant</Link> : null}

            <details className="rounded-xl border bg-white p-3" open={isPriorityPlatform(platform.key)}>
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">حقول الربط وشرح الحصول عليها</summary>
              <div className="mt-3 space-y-2">
                {platform.connectionFields.map((field) => <details key={field.key} className="rounded-xl border bg-slate-50 p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                    <span className="inline-flex flex-wrap items-center gap-2"><HelpCircle className="h-4 w-4 text-[#025EB8]" />{field.label}{field.required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">مطلوب</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">اختياري</span>}{field.secret ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">سري</span> : null}</span>
                  </summary>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{field.help}</p>
                  {field.placeholder ? <p className="mt-1 font-mono text-[11px] text-slate-400">مثال: {field.placeholder}</p> : null}
                </details>)}
              </div>
            </details>

            <details className="rounded-xl border bg-white p-3">
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">ما الذي يمكن سحبه وتحليله؟</summary>
              <section className="mt-3 grid gap-3 md:grid-cols-2">
                <InfoList title="يمكن سحبه" items={platform.canPull} />
                <InfoList title="يمكن تحليله" items={platform.canAnalyze} />
              </section>
            </details>

            <details className="rounded-xl border bg-white p-3">
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">حالة التنفيذ والخطة القادمة</summary>
              <section className="mt-3 grid gap-3 md:grid-cols-2">
                <InfoList title="موجود حاليًا" items={platform.implementedNow} tone="good" />
                <InfoList title="المرحلة القادمة" items={platform.plannedNext} tone="planned" />
              </section>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>روابط تشغيل سريعة</CardTitle>
        <CardDescription>الأدوات القديمة لم تُحذف. تم ترتيبها داخل النظام الجديد.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/connections">إدارة ربط المنصات الحالية</Link>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/pixels">إعدادات البكسلات الحالية</Link>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/ai-assistant">AI Assistant</Link>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/data-sync">سحب البيانات</Link>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/dashboard/marketing/insights">التحليل والتوصيات</Link>
      </CardContent>
    </Card>
  </div>;
}

function SummaryCard({ title, value, desc, icon }: { title: string; value: string; desc: string; icon: React.ReactNode }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div><p className="mt-1 text-xs text-slate-500">{desc}</p></CardContent></Card>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black text-slate-950">{value}</div></div>;
}

function Instruction({ text }: { text: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><ShieldCheck className="mb-2 h-4 w-4 text-[#025EB8]" />{text}</div>;
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "planned" }) {
  const iconClass = tone === "good" ? "text-emerald-600" : tone === "planned" ? "text-amber-600" : "text-[#025EB8]";
  return <div className="rounded-xl border bg-slate-50 p-3"><h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3><ul className="space-y-1">{items.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 ${iconClass}`} />{item}</li>)}</ul></div>;
}
