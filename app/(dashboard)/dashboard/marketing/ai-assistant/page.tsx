import Link from "next/link";
import { Bot, Brain, CheckCircle2, HelpCircle, KeyRound, Settings2 } from "lucide-react";
import { AI_ASSISTANT_CAPABILITIES, AI_ASSISTANT_FIELDS } from "@/lib/marketing/ai-assistant-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MarketingAiAssistantPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">AI Assistant Infrastructure</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">البنية التحتية لمساعد الذكاء الاصطناعي داخل الموقع. هنا نحدد ما الذي يحتاجه الربط، وما الذي سيحلله المساعد، وما المخرجات المتوقعة عند إضافة مفاتيح الـ API يدويًا.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <SummaryCard title="حقول الربط" value={String(AI_ASSISTANT_FIELDS.length)} icon={<KeyRound className="h-5 w-5" />} desc="Provider, API Key, Model, Base URL" />
      <SummaryCard title="قدرات التحليل" value={String(AI_ASSISTANT_CAPABILITIES.length)} icon={<Brain className="h-5 w-5" />} desc="أداء، ميزانية، Google، تتبع، إجراءات" />
      <SummaryCard title="الحالة" value="جاهز للبناء" icon={<Bot className="h-5 w-5" />} desc="أضف المفاتيح يدويًا ثم نربط التنفيذ" />
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#025EB8]" />حقول إعداد AI Assistant</CardTitle>
        <CardDescription>هذه هي الحقول التي سنحتاجها في لوحة الإعدادات الفعلية. كل حقل معه شرح واضح من أين يأتي وما فائدته.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {AI_ASSISTANT_FIELDS.map((field) => <details key={field.key} className="rounded-xl border bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">
            <span className="inline-flex flex-wrap items-center gap-2"><HelpCircle className="h-4 w-4 text-[#025EB8]" />{field.label}{field.required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">مطلوب</span> : <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">اختياري</span>}{field.secret ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">سري</span> : null}</span>
          </summary>
          <p className="mt-3 text-xs leading-6 text-slate-600">{field.help}</p>
          {field.placeholder ? <p className="mt-2 font-mono text-[11px] text-slate-400">مثال: {field.placeholder}</p> : null}
        </details>)}
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      {AI_ASSISTANT_CAPABILITIES.map((capability) => <Card key={capability.key}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-[#025EB8]" />{capability.title}</CardTitle>
          <CardDescription className="leading-6">{capability.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoList title="المدخلات" items={capability.inputs} />
          <InfoList title="المخرجات" items={capability.outputs} />
        </CardContent>
      </Card>)}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>مراحل التفعيل القادمة</CardTitle>
        <CardDescription>هذه الصفحة جهزت البنية. الخطوات التالية تكون إضافة التخزين والاختبار والتحليل الفعلي.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {['حفظ إعدادات AI بشكل آمن', 'اختبار الاتصال بالمزود', 'تشغيل تحليل AI على بيانات التسويق', 'حفظ توصيات AI وقائمة إجراءات'].map((item) => <div key={item} className="rounded-xl border bg-slate-50 p-3 text-sm font-semibold text-slate-800"><CheckCircle2 className="mb-2 h-4 w-4 text-[#025EB8]" />{item}</div>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والتتبع</Link>
        <Link href="/dashboard/marketing/insights" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">التحليل والتوصيات</Link>
        <Link href="/dashboard/marketing/data-sync" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">سحب البيانات</Link>
      </CardContent>
    </Card>
  </div>;
}

function SummaryCard({ title, value, desc, icon }: { title: string; value: string; desc: string; icon: React.ReactNode }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div><p className="mt-1 text-xs text-slate-500">{desc}</p></CardContent></Card>; }
function InfoList({ title, items }: { title: string; items: string[] }) { return <div className="rounded-xl border bg-slate-50 p-3"><h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3><ul className="space-y-1">{items.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-[#025EB8]" />{item}</li>)}</ul></div>; }
