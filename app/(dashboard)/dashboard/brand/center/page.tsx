import Link from "next/link";
import { ArrowLeft, Bot, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBrandCenterOverview } from "@/lib/brand/brand-service";
import { getAiAssistantReadiness } from "@/lib/ai/core/ai-core-service";

export const metadata = {
  title: "Brand Center | لوحة التحكم",
};

export default function BrandCenterPage() {
  const overview = getBrandCenterOverview();
  const aiReadiness = getAiAssistantReadiness("brand");

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Brand Center / Identity Guardrails</p>
        <h1 className="mt-1.5 text-2xl font-black">مركز الهوية</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          مصدر موحد لهوية المؤسسات، الألوان، قواعد النبرة، وملاحظات التواصل قبل ربط Brand AI الحقيقي.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="المؤسسات" value={overview.summary.organizations} />
        <SummaryCard title="الألوان" value={overview.summary.colors} />
        <SummaryCard title="قواعد الهوية" value={overview.summary.rules} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {overview.organizations.map((organization) => (
          <Card key={organization.key}>
            <CardHeader>
              <CardTitle>{organization.displayName}</CardTitle>
              <CardDescription>{organization.name} · {organization.website}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {organization.tone}
              </div>

              <div>
                <p className="text-sm font-black text-slate-900">الألوان</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {organization.colors.map((color) => (
                    <Badge key={color.value} variant="secondary">{color.name}: {color.value}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-slate-900">قواعد الاستخدام</p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                  {organization.usageRules.map((rule) => <p key={rule}>• {rule}</p>)}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-slate-900">بيانات التواصل</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {organization.contactLines.map((line) => <Badge key={line} variant="outline">{line}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#025EB8]" /> Brand AI Guardrails</CardTitle>
          <CardDescription>هذه المرحلة لا تولد محتوى تلقائيًا، لكنها تثبت قواعد الهوية التي يقرأها AI من Core واحد.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Feature icon={<ShieldCheck className="h-4 w-4" />} title="حماية الهوية" text="منع استخدام أسماء أو ألوان أو نبرة غير معتمدة." />
          <Feature icon={<Palette className="h-4 w-4" />} title="ألوان وقوالب" text="مرجع سريع للفرق قبل التصميم والنشر." />
          <Feature icon={<Sparkles className="h-4 w-4" />} title="AI لاحقًا" text="ربط Brand AI بنفس Shared AI Core بدون API منفصل." />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>ما الذي يقرأه Brand AI؟</CardTitle>
            <CardDescription>{aiReadiness?.provider.reason}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiReadiness?.tools.map((tool) => (
              <div key={tool.name} className="rounded-2xl border bg-slate-50 p-4">
                <p className="font-black text-slate-900">{tool.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{tool.dataSource}</p>
                <Badge variant="outline" className="mt-2">{tool.accessMode}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompts مفيدة</CardTitle>
            <CardDescription>استخدمه لمراجعة الهوية، وليس للنشر أو تعديل ملفات الشعار.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {aiReadiness?.promptExamples.map((prompt) => (
              <div key={prompt} className="rounded-2xl border bg-white p-4 text-sm font-semibold leading-6 text-slate-700">{prompt}</div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Link href="/dashboard/brand" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-slate-50">
        إعدادات الهوية الحالية
        <ArrowLeft className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border bg-slate-50 p-4"><span className="text-[#025EB8]">{icon}</span><h2 className="mt-2 font-black text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>;
}
