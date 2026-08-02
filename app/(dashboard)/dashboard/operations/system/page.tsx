import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Database, Megaphone, Rocket, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOperationsPersistenceSnapshot } from "@/lib/operations/repository";

const completed = [
  "مركز العمليات الرئيسي",
  "لوحة خطط المحتوى",
  "التقويم التشغيلي والمواسم",
  "خطة المحاور الأسبوعية",
  "لوحة مراحل الإنتاج",
  "مهام الإنتاج",
  "تجهيز التسليم للتسويق",
] as const;

const active = [
  "تثبيت نظام المحتوى كبيانات تشغيلية",
  "تنظيم المواسم والخطط الشهرية",
  "تجهيز عناصر المحتوى للتحديث المباشر",
  "ربط المحتوى بالنشر والتسويق",
] as const;

const next = [
  "قراءة المحتوى والخطط من قاعدة التشغيل",
  "إضافة وتعديل الخطط والعناصر والمهام من الواجهة",
  "تنبيهات المواسم والتأخير",
  "جدولة الرسائل يدويًا",
  "تسليم المحتوى المعتمد للتسويق مع روابط الحملات",
] as const;

const progress = [
  ["واجهة العمليات", 100, "مكتمل"],
  ["نظام المحتوى", 45, "قيد التجهيز"],
  ["إدارة التحديثات", 25, "قيد التجهيز"],
  ["الرسائل والتنبيهات", 10, "لاحقًا"],
  ["المساعد الذكي", 10, "لاحقًا"],
] as const;

const packages = [
  ["الحزمة 1", "نظام المحتوى التشغيلي", "قيد التنفيذ", "تجهيز المحتوى ليصبح سجلًا تشغيليًا قابلًا للربط بالنشر والإعلانات."],
  ["الحزمة 2", "تنظيف تجربة العمليات", "قيد التنفيذ", "توحيد المسميات وإزالة أي تفاصيل تقنية من واجهة الفريق."],
  ["الحزمة 3", "إنتاج المحتوى", "التالي", "تنظيم الخطة الشهرية وسير العمل ومتابعة المسؤوليات."],
  ["الحزمة 4", "ربط المحتوى بالإعلانات", "التالي", "ربط كل محتوى بروابط الحملات ونتائج الإعلان."],
  ["الحزمة 5", "الدروس المستفادة", "لاحقًا", "تحويل النتائج إلى مكتبة معرفة للفريق."],
  ["الحزمة 6", "التتبع والنتائج", "لاحقًا", "توضيح حقيقة التحويلات ومشاكل التتبع."],
] as const;

function readinessLabel(mode: string, readyForDb: boolean) {
  if (mode === "prisma") return "يعمل من بيانات محفوظة";
  if (readyForDb) return "جاهز للتحويل";
  return "يحتاج ترتيبًا إضافيًا";
}

export default async function OperationsSystemPage() {
  const persistence = await getOperationsPersistenceSnapshot();

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-brand p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">العمليات والمحتوى</p>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">حالة تجهيز النظام</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            متابعة مبسطة لما تم إنجازه، وما يتم تجهيزه الآن، وما سيظهر للفريق في المراحل التالية.
          </p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold">
          <Link href="/dashboard/operations">
            العودة لمركز العمليات <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {progress.map(([label, value, state]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}%</CardTitle>
              <Badge variant="outline" className="w-fit">{state}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-brand/20 bg-blue-50/50">
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-brand" /> الجاري الآن</CardTitle>
            <CardDescription className="mt-2 leading-6">
              نثبت نظام المحتوى التشغيلي خطوة بخطوة مع بقاء التسجيل الحالي يعمل كخطة أمان.
            </CardDescription>
          </div>
          <Link href="/dashboard/operations/content" className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-[#024f99]">
            فتح لوحة المحتوى
          </Link>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-brand" /> جاهزية بيانات التشغيل</CardTitle>
          <CardDescription className="leading-6">
            هذا القسم يوضح للفريق أي أجزاء أصبحت محفوظة وقابلة للاستخدام، وأي أجزاء ما زالت في مرحلة التجهيز.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-slate-500">إجمالي العناصر</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">{persistence.summary.totalRecords}</h3>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-slate-500">أجزاء في التجهيز</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">{persistence.summary.foundationDatasets}</h3>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-slate-500">جاهزة للحفظ الدائم</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">{persistence.summary.dbReadyDatasets}</h3>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-slate-500">تحتاج متابعة آلية</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">{persistence.summary.generatedDatasets}</h3>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {persistence.datasets.map((dataset) => (
              <div key={dataset.key} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-brand">{dataset.label}</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">{dataset.total}</h3>
                  </div>
                  <Badge variant="outline">{readinessLabel(dataset.persistence.mode, dataset.persistence.readyForDb)}</Badge>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  المرحلة الحالية: {readinessLabel(dataset.persistence.mode, dataset.persistence.readyForDb)}
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-700">
                  {dataset.persistence.readyForDb ? "جاهز للمرحلة التالية" : "يحتاج مراجعة قبل التفعيل"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>خارطة الحزم التنفيذية</CardTitle>
          <CardDescription>تسلسل العمل من لوحة تشغيل مبسطة إلى نظام متكامل للمحتوى والتسويق.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packages.map(([code, title, state, description]) => (
            <div key={code} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-brand">{code}</p>
                  <h3 className="mt-1 font-black text-slate-900">{title}</h3>
                </div>
                <Badge variant="outline">{state}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> تم إنجازه</CardTitle>
            <CardDescription>أجزاء أصبحت ظاهرة داخل لوحة التحكم.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {completed.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border bg-emerald-50/50 p-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-brand" /> الجاري الآن</CardTitle>
            <CardDescription>المرحلة الحالية لتجهيز النظام للاستخدام اليومي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {active.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border bg-blue-50/50 p-3 text-sm text-slate-700">
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-amber-600" /> القادم</CardTitle>
            <CardDescription>ما سيجعل النظام قابلًا للاستخدام اليومي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {next.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border bg-amber-50/50 p-3 text-sm text-slate-700">
                <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-brand" /> قاعدة العمل</CardTitle>
          <CardDescription>كل مرحلة جديدة يجب أن تظهر داخل اللوحة بصورة مفهومة للفريق، وليس كشرح تقني.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-slate-700">
          <p>
            أي حزمة قادمة سيكون لها أثر واضح داخل لوحة التحكم: صفحة، أو مؤشر تقدم، أو قسم متابعة، أو حالة تنفيذ، مع إبقاء التفاصيل التقنية خارج واجهة المستخدم اليومية.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
