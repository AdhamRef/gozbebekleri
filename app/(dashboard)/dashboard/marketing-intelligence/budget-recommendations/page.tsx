"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Recommendation = {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  decision: "SCALE" | "HOLD" | "REDUCE" | "PAUSE" | "FIX_TRACKING" | "REVIEW";
  title: string;
  reason: string;
  action: string;
  href: string;
  metrics: { spend?: number; siteRevenue?: number; siteRoas?: number; platformRoas?: number; siteDonations?: number; platformConversions?: number; donationGap?: number };
};

type ApiResponse = {
  ok: boolean;
  summary: { total: number; scale: number; pause: number; reduce: number; fixTracking: number; spend: number; siteRevenue: number; siteRoas: number };
  recommendations: Recommendation[];
};

function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"; }
function decisionLabel(decision: Recommendation["decision"]) {
  if (decision === "SCALE") return "زود";
  if (decision === "PAUSE") return "أوقف";
  if (decision === "REDUCE") return "خفّض";
  if (decision === "FIX_TRACKING") return "أصلح التتبع";
  if (decision === "HOLD") return "ثبّت";
  return "راجع";
}
function decisionClass(decision: Recommendation["decision"]) {
  if (decision === "SCALE") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (decision === "PAUSE" || decision === "REDUCE") return "border-rose-200 bg-rose-50 text-rose-800";
  if (decision === "FIX_TRACKING") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function icon(decision: Recommendation["decision"]) {
  if (decision === "SCALE") return <TrendingUp className="h-4 w-4" />;
  if (decision === "PAUSE" || decision === "REDUCE") return <TrendingDown className="h-4 w-4" />;
  if (decision === "FIX_TRACKING") return <Wrench className="h-4 w-4" />;
  if (decision === "HOLD") return <CheckCircle2 className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

export default function BudgetRecommendationsPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [platform, setPlatform] = React.useState("ALL");
  const [days, setDays] = React.useState(7);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, days: String(days) });
      const res = await fetch(`/api/admin/marketing-intelligence/budget-recommendations?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل توصيات الميزانية");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [platform, days]);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">توصيات التشغيل والميزانية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">قرارات عملية مبنية على مقارنة بيانات المنصات مع تبرعات الموقع: زود، أوقف، خفّض، أصلح التتبع، أو راجع.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="ALL">كل المنصات</option><option value="META">Meta</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK">TikTok</option><option value="X">X</option><option value="GA4">GA4</option></select>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border bg-white px-3 py-2 text-sm"><option value={1}>اليوم</option><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يوم</option><option value={90}>آخر 90 يوم</option></select>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Kpi label="إجمالي" value={String(data.summary.total)} />
        <Kpi label="زود" value={String(data.summary.scale)} />
        <Kpi label="أوقف" value={String(data.summary.pause)} />
        <Kpi label="خفّض" value={String(data.summary.reduce)} />
        <Kpi label="أصلح التتبع" value={String(data.summary.fixTracking)} />
        <Kpi label="Site ROAS" value={`${data.summary.siteRoas.toFixed(2)}x`} />
      </div>

      <Card>
        <CardHeader><CardTitle>قائمة القرارات</CardTitle><CardDescription>هذه التوصيات تعتمد على البيانات المتاحة، ولا تغني عن مراجعة جودة الإعلان والجمهور قبل قرارات كبيرة.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {data.recommendations.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد توصيات بعد. أدخل أو استورد بيانات المنصات أولًا.</div> : data.recommendations.map((rec) => <div key={rec.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-4xl">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${decisionClass(rec.decision)}`}>{icon(rec.decision)}{decisionLabel(rec.decision)}</span>
                <h2 className="mt-2 text-base font-bold text-slate-950">{rec.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{rec.reason}</p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><b>الإجراء:</b> {rec.action}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Spend: {money(rec.metrics.spend)}</span>
                  <span>Site Revenue: {money(rec.metrics.siteRevenue)}</span>
                  <span>Site ROAS: {(rec.metrics.siteRoas || 0).toFixed(2)}x</span>
                  <span>تبرعات الموقع: {rec.metrics.siteDonations || 0}</span>
                  <span>تحويلات المنصة: {rec.metrics.platformConversions || 0}</span>
                </div>
              </div>
              <Link href={rec.href} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح المصدر</Link>
            </div>
          </div>)}
        </CardContent>
      </Card>
    </>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></CardContent></Card>; }
