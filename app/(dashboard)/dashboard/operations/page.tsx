import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardList, FileText, Megaphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  ["التقويم", "المناسبات، المواسم، والأسابيع التشغيلية.", CalendarDays],
  ["خطة المحتوى", "الأفكار، النصوص، التصاميم، والفيديوهات.", FileText],
  ["مهام الفريق", "من المسؤول؟ ما الحالة؟ وما موعد التسليم؟", ClipboardList],
  ["التسليم للتسويق", "ربط المحتوى لاحقًا بروابط الحملات ونتائج الأداء.", Megaphone],
] as const;

const rules = [
  "Operations لا يعيد بناء Marketing.",
  "Marketing يبقى مسؤولًا عن الربط، التتبع، الروابط، والتحليلات.",
  "Operations مسؤول عن التخطيط، الإنتاج، المهام، والنشر.",
  "أي AI لاحقًا يكون Draft ويحتاج مراجعة بشرية.",
] as const;

export default function OperationsHomePage() {
  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
      <p className="text-xs text-white/70">Growth Suite</p>
      <h1 className="mt-1.5 text-2xl font-black">مركز العمليات والمحتوى</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">هذه بداية نظام العمليات. الهدف تنظيم التقويم، المحتوى، المهام، وتسليم العمل الجاهز إلى نظام التسويق بدون خلط المسؤوليات.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {pillars.map(([title, description, Icon]) => <Card key={title} className="h-full">
        <CardHeader>
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="leading-6">{description}</CardDescription>
        </CardHeader>
      </Card>)}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>حدود الحزمة الأولى</CardTitle>
          <CardDescription>هذه الحزمة تؤسس الصفحة فقط ولا تضيف قاعدة بيانات أو APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((rule) => <div key={rule} className="flex gap-2 rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#025EB8]" />{rule}</div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الخطوة التالية</CardTitle>
          <CardDescription>بعد اعتماد الأساس سنضيف Data Model في حزمة منفصلة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
          <p>الحزمة القادمة ستضيف نماذج البيانات مثل ContentItem وContentTask وContentPlan بدون بناء واجهة كبيرة في نفس الخطوة.</p>
          <Link href="/dashboard/marketing" className="inline-flex rounded-md border px-3 py-2 text-sm font-semibold hover:bg-slate-50">العودة إلى نظام التسويق</Link>
        </CardContent>
      </Card>
    </div>
  </div>;
}
