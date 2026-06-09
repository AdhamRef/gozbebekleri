import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock3, FileText, Filter, Megaphone, PlusCircle, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    title: "رمضان 2027",
    theme: "زكاة، إفطار، وصدقة يومية",
    status: "PLANNING",
    items: 18,
    published: 0,
    date: "مارس 2027",
  },
  {
    title: "عشر ذي الحجة",
    theme: "أضاحي، وقف، ورسائل تذكير",
    status: "PLANNING",
    items: 12,
    published: 0,
    date: "يونيو 2027",
  },
  {
    title: "حملة الوقف للقدس",
    theme: "محتوى توعوي + شهادات وقف",
    status: "ACTIVE",
    items: 9,
    published: 3,
    date: "مستمرة",
  },
] as const;

const items = [
  { title: "فكرة سلسلة رمضان اليومية", type: "IDEA", status: "IDEA", channel: "All Channels", due: "هذا الشهر" },
  { title: "كاروسيل: كيف تحسب زكاتك؟", type: "CAROUSEL", status: "WRITING", channel: "Instagram", due: "هذا الأسبوع" },
  { title: "تصميم حملة غزة العاجلة", type: "DESIGN", status: "DESIGN", channel: "Meta Ads", due: "غدًا" },
  { title: "فيديو تعريفي عن الوقف", type: "VIDEO", status: "REVIEW", channel: "YouTube / Reels", due: "الأسبوع القادم" },
  { title: "رسالة واتساب للجمعة", type: "WHATSAPP", status: "APPROVED", channel: "WhatsApp", due: "الجمعة" },
] as const;

const boardColumns = [
  ["IDEA", "أفكار", "مواد تحتاج اعتماد الفكرة"],
  ["WRITING", "كتابة", "النصوص والسكريبتات"],
  ["DESIGN", "تصميم", "تصاميم وفيديوهات قيد الإنتاج"],
  ["REVIEW", "مراجعة", "جاهز للمراجعة النهائية"],
  ["APPROVED", "معتمد", "جاهز للنشر أو التسويق"],
] as const;

const filters = ["كل الحالات", "IDEA", "WRITING", "DESIGN", "REVIEW", "APPROVED"] as const;

const statusClass: Record<string, string> = {
  PLANNING: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IDEA: "bg-slate-50 text-slate-700 border-slate-200",
  REVIEW: "bg-purple-50 text-purple-700 border-purple-200",
  WRITING: "bg-sky-50 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DESIGN: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function OperationsContentPage() {
  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Operations / Content</p>
          <h1 className="mt-1.5 text-2xl font-black">لوحة خطط المحتوى</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            واجهة تشغيلية مبدئية لتنظيم الخطط وعناصر المحتوى قبل ربط قاعدة البيانات. هذه النسخة تضيف تصورًا للفلاتر ومراحل الإنتاج دون API أو Prisma.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="gap-2 font-bold">
            <Link href="/dashboard/operations">
              <PlusCircle className="h-4 w-4" /> العودة لمركز العمليات
            </Link>
          </Button>
          <Button variant="secondary" disabled className="gap-2 font-bold opacity-80">
            <PlusCircle className="h-4 w-4" /> إضافة عنصر قريبًا
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>الخطط النشطة</CardDescription>
            <CardTitle className="text-3xl">3</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>عناصر المحتوى</CardDescription>
            <CardTitle className="text-3xl">39</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>جاهز للتسويق</CardDescription>
            <CardTitle className="text-3xl">4</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>مواعيد قادمة</CardDescription>
            <CardTitle className="text-3xl">7</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-[#025EB8]" /> فلاتر التشغيل</CardTitle>
            <CardDescription className="mt-2">فلاتر شكلية الآن، وسيتم تفعيلها عند ربط قاعدة البيانات.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Badge key={filter} variant="outline" className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{filter}</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" /> البحث في العناصر والخطط سيتم تفعيله بعد CRUD.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مراحل إنتاج المحتوى</CardTitle>
          <CardDescription>Kanban ثابت يوضح طريقة العمل المقترحة قبل ربط البيانات الحقيقية.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 xl:grid-cols-5">
            {boardColumns.map(([status, label, description]) => {
              const columnItems = items.filter((item) => item.status === status);
              return (
                <div key={status} className="rounded-2xl border bg-slate-50 p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900">{label}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                    </div>
                    <Badge variant="outline" className={statusClass[status]}>{columnItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {columnItems.map((item) => (
                      <div key={item.title} className="rounded-xl border bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold leading-6 text-slate-900">{item.title}</h4>
                          <Badge variant="outline" className={statusClass[item.status]}>{item.type}</Badge>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <p>القناة: <b>{item.channel}</b></p>
                          <p>الموعد: <b>{item.due}</b></p>
                        </div>
                      </div>
                    ))}
                    {columnItems.length === 0 ? <p className="rounded-xl border border-dashed bg-white p-3 text-center text-xs text-slate-400">لا توجد عناصر حالية</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#025EB8]" /> خطط المحتوى
            </CardTitle>
            <CardDescription>نماذج ثابتة لما سيصبح لاحقًا ContentPlan بعد تفعيل Prisma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.title} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black text-slate-900">{plan.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{plan.theme}</p>
                  </div>
                  <Badge variant="outline" className={statusClass[plan.status]}>{plan.status}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <span>العناصر: <b>{plan.items}</b></span>
                  <span>منشور: <b>{plan.published}</b></span>
                  <span>الفترة: <b>{plan.date}</b></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#025EB8]" /> عناصر المحتوى
            </CardTitle>
            <CardDescription>قائمة مختصرة بجانب Kanban لتوضيح تفاصيل العناصر.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.title} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <Badge variant="outline" className={statusClass[item.status]}>{item.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <span>النوع: <b>{item.type}</b></span>
                  <span>القناة: <b>{item.channel}</b></span>
                  <span className="sm:col-span-2">الموعد: <b>{item.due}</b></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> حدود الحزمة</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-700">
            لا توجد كتابة في قاعدة البيانات، ولا API، ولا صلاحيات جديدة. هذه الصفحة Shell فقط لمراجعة تجربة العمل.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#025EB8]" /> التسليم للتسويق</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-700">
            لاحقًا سيتم ربط العناصر المعتمدة بمنشئ الروابط والإعلانات بدون تكرار نظام Marketing.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-amber-600" /> القادم</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-700">
            بعد تفعيل Prisma، نضيف قراءة الخطط والعناصر ثم CRUD منفصل ثم تقويم المواسم.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
