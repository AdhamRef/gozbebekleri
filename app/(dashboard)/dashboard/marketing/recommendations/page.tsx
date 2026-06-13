import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BrainCircuit,
  Lightbulb,
  Megaphone,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecommendationOverview } from "@/lib/ai/recommendations/recommendation-service";

const priorityClass: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const confidenceClass: Record<string, string> = {
  HIGH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-blue-200 bg-blue-50 text-blue-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const typeIcon: Record<string, typeof TrendingUp> = {
  SCALE_WINNER: TrendingUp,
  IMPROVE_CREATIVE: Lightbulb,
  FIX_TRACKING: ShieldAlert,
  REUSE_ASSET: Sparkles,
  PAUSE_OR_REWORK: Megaphone,
  PREPARE_SEASON: BadgeCheck,
};

export default function MarketingRecommendationsPage() {
  const overview = getRecommendationOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">AI Foundation / Recommendations</p>
          <h1 className="mt-1.5 text-2xl font-black">توصيات التسويق الذكية</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            طبقة توصيات أولية مبنية على القواعد ونتائج التسويق الحالية، تمهيدًا لربطها لاحقًا بـ AI Core مشترك.
          </p>
        </div>
        <Link
          href="/dashboard/marketing/results"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90"
        >
          فتح نتائج التسويق
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardDescription>كل التوصيات</CardDescription><CardTitle className="text-3xl">{overview.summary.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>عالية الأولوية</CardDescription><CardTitle className="text-3xl">{overview.summary.highPriority}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>التسويق</CardDescription><CardTitle className="text-3xl">{overview.summary.marketing}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>التشغيل</CardDescription><CardTitle className="text-3xl">{overview.summary.operations}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>الأرشيف</CardDescription><CardTitle className="text-3xl">{overview.summary.archive}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {overview.recommendations.map((recommendation) => {
          const Icon = typeIcon[recommendation.type] ?? BrainCircuit;
          return (
            <Card key={recommendation.id} className="overflow-hidden">
              <CardHeader className="border-b bg-slate-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#025EB8] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {recommendation.area} · {recommendation.type}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={priorityClass[recommendation.priority]}>{recommendation.priority}</Badge>
                    <Badge variant="outline" className={confidenceClass[recommendation.confidence]}>{recommendation.confidence}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 lg:grid-cols-3">
                <div className="rounded-2xl border bg-white p-3">
                  <p className="text-sm font-black text-slate-900">السبب</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.reason}</p>
                </div>
                <div className="rounded-2xl border bg-white p-3">
                  <p className="text-sm font-black text-slate-900">الإجراء المقترح</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.suggestedAction}</p>
                </div>
                <div className="rounded-2xl border bg-white p-3">
                  <p className="text-sm font-black text-slate-900">الأثر المتوقع</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.expectedImpact}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
