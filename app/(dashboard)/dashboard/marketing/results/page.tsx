import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketingResultsOverview } from "@/lib/marketing/results/results-service";

export const dynamic = "force-dynamic";

const statusClass: Record<string, string> = {
  WINNER: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WATCH: "border-blue-200 bg-blue-50 text-blue-700",
  LEARNING: "border-amber-200 bg-amber-50 text-amber-700",
  LOSING: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusLabel: Record<string, string> = {
  WINNER: "ناجحة",
  WATCH: "قيد المتابعة",
  LEARNING: "قيد التعلّم",
  LOSING: "متعثّرة",
};

const statusIcon: Record<string, typeof TrendingUp> = {
  WINNER: TrendingUp,
  WATCH: BarChart3,
  LEARNING: Lightbulb,
  LOSING: TrendingDown,
};

export default async function MarketingResultsPage() {
  const overview = await getMarketingResultsOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold text-[#025EB8]">التسويق / النتائج</p>
          <h1 className="mt-1 text-xl font-black text-slate-900">نتائج التسويق والتعلّم</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            ربط مواد الأرشيف بالحملات والنتائج والقرارات حتى نعرف ما الذي يجب تكراره أو تعديله أو إيقافه.
          </p>
        </div>
        <Link
          href="/dashboard/operations/archive"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#025EB8]/50 hover:text-[#025EB8]"
        >
          فتح الأرشيف
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardDescription>نتائج متابعة</CardDescription><CardTitle className="text-3xl">{overview.summary.totalResults}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>إجمالي الإنفاق</CardDescription><CardTitle className="text-3xl">${overview.summary.totalSpend}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>إجمالي الإيراد</CardDescription><CardTitle className="text-3xl">${overview.summary.totalRevenue}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>التبرعات</CardDescription><CardTitle className="text-3xl">{overview.summary.totalDonations}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>متوسط ROAS</CardDescription><CardTitle className="text-3xl">{overview.summary.averageRoas}x</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>فائز/خاسر</CardDescription><CardTitle className="text-3xl">{overview.summary.winners}/{overview.summary.losing}</CardTitle></CardHeader></Card>
      </div>

      {overview.results.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد نتائج حملات بعد لهذه الفترة. ستظهر النتائج تلقائيًا عند توفّر إنفاق إعلاني مسحوب أو تبرعات منسوبة لحملة.</CardContent></Card>
      ) : (
      <div className="grid gap-4 xl:grid-cols-2">
        {overview.results.map((result) => {
          const Icon = statusIcon[result.status] ?? BarChart3;
          return (
            <Card key={result.id} className="overflow-hidden">
              <CardHeader className="border-b bg-slate-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#025EB8] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">{result.assetTitle}</CardTitle>
                      <CardDescription className="mt-1">{result.campaignTitle} · {result.channel}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusClass[result.status]}>{statusLabel[result.status] ?? result.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">الإنفاق</p><p className="font-black">${result.spend}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">الإيراد</p><p className="font-black">${result.revenue}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">التبرعات</p><p className="font-black">{result.donations}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">النقرات</p><p className="font-black">{result.clicks}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">العائد على الإنفاق</p><p className="font-black">{result.roas}x</p></div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-3">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Megaphone className="h-4 w-4 text-[#025EB8]" /> القرار المقترح</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{result.decision}</p>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-900"><MousePointerClick className="h-4 w-4 text-[#025EB8]" /> التعلم</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{result.learning}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
