"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Bot, Brain, Database, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CampaignRow = {
  platform: string;
  campaignId: string | null;
  campaignName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  currency: string | null;
};

type Overview = {
  ok: boolean;
  range: { days: number; from: string; to: string };
  summary: {
    spend: number;
    platformRevenue: number;
    platformConversions: number;
    platformClicks: number;
    platformImpressions: number;
    siteRevenue: number;
    siteDonations: number;
    allPaidDonations: number;
    siteRoas: number;
    platformRoas: number;
    activeConnections: number;
    totalConnections: number;
    failedSyncs: number;
  };
  campaigns: CampaignRow[];
};

function money(value: number | null | undefined, currency = "USD") {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}` : "—";
}

function number(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
}

function roas(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}x` : "—";
}

function buildRecommendations(data: Overview) {
  const recs: { tone: "good" | "warn" | "bad"; title: string; body: string }[] = [];
  if (data.summary.totalConnections === 0) recs.push({ tone: "warn", title: "اربط المنصات أولًا", body: "لا توجد حسابات إعلانية مربوطة، لذلك لا يمكن إعطاء توصيات دقيقة للصرف." });
  if (data.summary.spend === 0) recs.push({ tone: "warn", title: "لا يوجد صرف ظاهر", body: "شغّل سحب البيانات أو راجع ربط المنصات إذا كان هناك صرف فعلي في الحسابات." });
  if (data.summary.failedSyncs > 0) recs.push({ tone: "bad", title: "مزامنات فاشلة", body: `يوجد ${data.summary.failedSyncs} محاولة سحب فشلت أو ناقصة الإعداد. ابدأ من جودة التتبع والإصلاح.` });
  if (data.summary.spend > 0 && data.summary.siteRoas >= 2) recs.push({ tone: "good", title: "ROAS جيد", body: "الأداء الحقيقي جيد. راجع الحملات الأعلى ربحًا قبل زيادة الميزانية تدريجيًا." });
  if (data.summary.spend > 0 && data.summary.siteRoas > 0 && data.summary.siteRoas < 1) recs.push({ tone: "bad", title: "ROAS ضعيف", body: "الصرف أعلى من التبرعات المنسوبة. راجع الروابط والتتبع والحملات الأعلى صرفًا." });
  const waste = data.campaigns.filter((c) => c.spend > 0 && c.conversions === 0).slice(0, 3);
  for (const c of waste) recs.push({ tone: "bad", title: "صرف بدون تحويلات", body: `${c.campaignName || c.campaignId || c.platform}: صرف ${money(c.spend, c.currency || "USD")} بدون تحويلات منصة ظاهرة.` });
  if (!recs.length) recs.push({ tone: "good", title: "لا توجد تنبيهات حرجة", body: "البيانات الحالية لا تظهر مشكلة حرجة. استمر في مراقبة الحملات بعد كل سحب بيانات." });
  return recs;
}

export default function MarketingInsightsPage() {
  const [days, setDays] = React.useState(7);
  const [data, setData] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async (targetDays = days) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing-intelligence/overview?days=${targetDays}`, { cache: "no-store" });
      const json = await res.json().catch(() => null) as Overview | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل بيانات التحليل والتوصيات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => { void load(days); }, []);

  const topCampaigns = [...(data?.campaigns ?? [])].sort((a, b) => b.spend - a.spend).slice(0, 6);
  const recommendations = data ? buildRecommendations(data) : [];

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/75">Marketing Operating System</p>
          <h1 className="mt-2 text-3xl font-black">التحليل والتوصيات AI</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">مركز القرار: ملخص الأداء، تنبيهات واضحة، وتحضير طبقة AI Assistant فوق بيانات المنصات والتبرعات.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 7, 14, 30].map((d) => <Button key={d} variant={days === d ? "secondary" : "outline"} className={days === d ? "" : "border-white/30 bg-white/10 text-white hover:bg-white/20"} onClick={() => { setDays(d); void load(d); }}>{d === 1 ? "اليوم" : `${d} يوم`}</Button>)}
          <Button variant="secondary" onClick={() => load(days)} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>
        </div>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">لا توجد بيانات متاحة للتحليل.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Kpi title="الصرف" value={money(data.summary.spend)} icon={<Database className="h-4 w-4" />} />
        <Kpi title="تبرعات الإعلانات" value={money(data.summary.siteRevenue)} hint={`${data.summary.siteDonations} تبرع`} icon={<TrendingUp className="h-4 w-4" />} />
        <Kpi title="ROAS الحقيقي" value={roas(data.summary.siteRoas)} icon={<Brain className="h-4 w-4" />} />
        <Kpi title="تحويلات المنصات" value={number(data.summary.platformConversions)} icon={<Bot className="h-4 w-4" />} />
        <Kpi title="الحسابات" value={`${data.summary.activeConnections}/${data.summary.totalConnections}`} hint="نشط/إجمالي" icon={<Database className="h-4 w-4" />} />
        <Kpi title="مزامنات فاشلة" value={number(data.summary.failedSyncs)} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-[#025EB8]" />توصيات تشغيلية</CardTitle><CardDescription>تحليل أولي مبني على البيانات الحالية، وسيتم ربطه بالـ AI Assistant في الحزم القادمة.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{recommendations.map((rec) => <Notice key={`${rec.title}-${rec.body}`} tone={rec.tone} title={rec.title} body={rec.body} />)}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-[#025EB8]" />أهم الحملات حسب الصرف</CardTitle><CardDescription>قائمة مختصرة للحملات التي تحتاج مراجعة أو تحليل أعمق.</CardDescription></CardHeader>
          <CardContent className="space-y-2">{topCampaigns.length === 0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد حملات مسحوبة حتى الآن.</div> : topCampaigns.map((campaign) => <div key={`${campaign.platform}-${campaign.campaignId || campaign.campaignName}`} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{campaign.campaignName || campaign.campaignId || "حملة بدون اسم"}</b><span className="font-mono text-[#025EB8]">{money(campaign.spend, campaign.currency || "USD")}</span></div><div className="mt-1 text-xs text-slate-500">{campaign.platform} • نقرات {number(campaign.clicks)} • تحويلات {number(campaign.conversions)}</div></div>)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Google Ads Deep Analysis</CardTitle><CardDescription>المرحلة القادمة ستقرأ الكلمات وSearch Terms والعناوين والأوصاف والأصول لتقليل التشتيت في Google Ads.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{["Keywords", "Search Terms", "Headlines", "Descriptions & Assets"].map((item) => <div key={item} className="rounded-xl border bg-slate-50 p-3 text-sm font-semibold text-slate-800">{item}</div>)}</CardContent>
      </Card>
    </>}

    <Card><CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والتتبع</Link><Link href="/dashboard/marketing/data-sync" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">سحب البيانات</Link><Link href="/dashboard/ads" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الإعلانات التفصيلية</Link></CardContent></Card>
  </div>;
}

function Kpi({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon: React.ReactNode }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div>{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</CardContent></Card>; }
function Notice({ title, body, tone }: { title: string; body: string; tone: "good" | "warn" | "bad" }) { const cls = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"; return <div className={`rounded-xl border p-3 ${cls}`}><div className="font-bold">{title}</div><div className="mt-1 text-sm leading-6">{body}</div></div>; }
