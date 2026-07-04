"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Brain, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingPageHeader } from "../_components/MarketingPageHeader";
import { MarketingQuickNav } from "../_components/MarketingQuickNav";

type CampaignRow = { platform: string; campaignId: string | null; campaignName: string | null; spend: number; clicks: number; conversions: number; revenue: number; currency: string | null };
type Overview = {
  ok: boolean;
  summary: {
    spend: number;
    platformRevenue: number;
    platformConversions: number;
    siteRevenue: number;
    siteDonations: number;
    platformRoas: number;
    siteRoas: number;
    activeConnections: number;
    totalConnections: number;
    failedSyncs: number;
  };
  campaigns: CampaignRow[];
};

function money(value: number | null | undefined, currency = "USD") { return typeof value === "number" && Number.isFinite(value) ? `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"; }
function roas(value: number | null | undefined, spend: number | null | undefined) { return typeof spend === "number" && spend > 0 && typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}x` : "غير متاح"; }
function n(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—"; }

function recommendations(data: Overview) {
  const out: { tone: "good" | "warn" | "bad"; title: string; body: string }[] = [];
  if (data.summary.failedSyncs > 0) out.push({ tone: "bad", title: "يوجد فشل في السحب", body: "ابدأ من جودة التتبع والإصلاح قبل اتخاذ قرارات ميزانية." });
  if (data.summary.totalConnections === 0) out.push({ tone: "warn", title: "اربط المنصات أولًا", body: "لا يمكن تحليل الصرف بدقة قبل ربط الحسابات وسحب البيانات." });
  if (data.summary.spend === 0) out.push({ tone: "warn", title: "لا يوجد صرف ظاهر", body: "ROAS غير متاح الآن لأن بيانات الصرف غير مسحوبة أو غير مرتبطة. شغّل سحب البيانات أو راجع الحسابات المتصلة." });
  if (data.summary.spend > 0 && data.summary.siteRoas >= 2) out.push({ tone: "good", title: "الأداء جيد", body: "راجع أفضل الحملات ثم زِد الميزانية تدريجيًا." });
  if (data.summary.spend > 0 && data.summary.siteRoas > 0 && data.summary.siteRoas < 1) out.push({ tone: "bad", title: "العائد ضعيف", body: "راجع الروابط والحملات الأعلى صرفًا قبل الاستمرار." });
  if (data.summary.platformRevenue > 0) {
    const matchRatio = data.summary.siteRevenue / data.summary.platformRevenue;
    if (matchRatio < 0.6) out.push({ tone: "warn", title: "فجوة في مطابقة الإيراد", body: "إيراد الموقع المنسوب أقل بوضوح من الإيراد الذي تبلّغ عنه المنصات — راجع دقة التتبع (Pixel/CAPI) وأحداث التحويل قبل الوثوق بأرقام المنصة." });
    else if (matchRatio > 1.4) out.push({ tone: "good", title: "تتبع الموقع أقوى من المنصات", body: "الموقع يسجّل إيرادًا أعلى مما تبلّغه المنصات؛ اعتمد إيراد الموقع كمصدر الحقيقة في قرارات الميزانية." });
  }
  if (!out.length) out.push({ tone: "good", title: "الوضع مستقر", body: "لا توجد مشكلة حرجة في البيانات الحالية." });
  return out;
}

export default function MarketingInsightsPage() {
  const [days, setDays] = React.useState(7);
  const [data, setData] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function load(targetDays = days) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing-intelligence/overview?days=${targetDays}`, { cache: "no-store" });
      const json = await res.json().catch(() => null) as Overview | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل التحليل");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(7); }, []);
  const topCampaigns = [...(data?.campaigns ?? [])].sort((a, b) => b.spend - a.spend).slice(0, 5);
  const hasSpend = (data?.summary.spend ?? 0) > 0;
  const platformRevenue = data?.summary.platformRevenue ?? 0;
  const revenueGap = platformRevenue - (data?.summary.siteRevenue ?? 0); // منصّات مقابل الموقع
  const hasPlatformRevenue = platformRevenue > 0;

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <MarketingPageHeader
      title="التحليل والتوصيات"
      description="صفحة قرار مختصرة: الصرف، التبرعات، العائد، وأهم ما يجب فعله. لا يتم عرض ROAS كرقم حقيقي إلا عند وجود بيانات صرف صالحة."
      actions={<>{[1, 7, 14, 30].map((d) => <Button key={d} variant={days === d ? "secondary" : "outline"} className={days === d ? "" : "border-white/30 bg-white/10 text-white hover:bg-white/20"} onClick={() => { setDays(d); void load(d); }}>{d === 1 ? "اليوم" : `${d} يوم`}</Button>)}<Button variant="secondary" onClick={() => load(days)} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button></>}
    />

    <MarketingQuickNav />

    {loading ? <div className="flex min-h-[18rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Kpi title="الصرف" value={money(data.summary.spend)} icon={<BarChart3 className="h-4 w-4" />} /><Kpi title="إيراد الموقع (تتبعنا)" value={money(data.summary.siteRevenue)} hint={`${data.summary.siteDonations} تبرع منسوب`} icon={<TrendingUp className="h-4 w-4" />} /><Kpi title="إيراد المنصات (تبليغها)" value={hasPlatformRevenue ? money(platformRevenue) : "غير متاح"} hint={hasPlatformRevenue ? `${n(data.summary.platformConversions)} تحويل مُبلَّغ` : "لا بيانات منصات"} icon={<BarChart3 className="h-4 w-4" />} /><Kpi title="الفرق (منصات − موقع)" value={hasPlatformRevenue ? money(revenueGap) : "—"} hint={hasPlatformRevenue ? "فجوة الإسناد" : undefined} icon={<AlertTriangle className="h-4 w-4" />} /><Kpi title="ROAS الموقع (الحقيقي)" value={roas(data.summary.siteRoas, data.summary.spend)} hint={hasSpend ? "إيراد الموقع ÷ الصرف" : "لا يوجد صرف مسحوب"} icon={<Brain className="h-4 w-4" />} /><Kpi title="ROAS المنصات" value={roas(data.summary.platformRoas, data.summary.spend)} hint={hasSpend ? "إيراد المنصات ÷ الصرف" : undefined} icon={<Brain className="h-4 w-4" />} /><Kpi title="الحسابات" value={`${data.summary.activeConnections}/${data.summary.totalConnections}`} /><Kpi title="أخطاء السحب" value={n(data.summary.failedSyncs)} icon={<AlertTriangle className="h-4 w-4" />} /></div>

      {hasSpend && hasPlatformRevenue ? <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-base">مطابقة الإيراد: الموقع مقابل المنصات</CardTitle><CardDescription>إيراد الموقع مصدر حقيقة أول (بيانات تبرعات فعلية). إيراد المنصات تقدير مبلَّغ منها. اعتمد أرقام الموقع في قرارات الميزانية.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">ROAS الحقيقي (الموقع)</div><div className="mt-1 text-xl font-black text-slate-950">{roas(data.summary.siteRoas, data.summary.spend)}</div></div>
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">ROAS المنصات</div><div className="mt-1 text-xl font-black text-slate-950">{roas(data.summary.platformRoas, data.summary.spend)}</div></div>
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">مطابقة الإيراد</div><div className="mt-1 text-xl font-black text-slate-950">{platformRevenue > 0 ? `${Math.round((data.summary.siteRevenue / platformRevenue) * 100)}%` : "—"}</div></div>
        </CardContent>
      </Card> : null}

      {!hasSpend ? <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-sm leading-6 text-amber-900">
          <b>تنبيه أداء:</b> توجد تبرعات، لكن لا توجد بيانات صرف مسحوبة لهذه الفترة. لذلك لا يتم حساب ROAS كرقم حقيقي الآن. ابدأ من سحب البيانات أو راجع الحسابات المتصلة.
        </CardContent>
      </Card> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>التوصيات</CardTitle><CardDescription>قرارات مختصرة مبنية على البيانات الحالية.</CardDescription></CardHeader><CardContent className="space-y-3">{recommendations(data).map((item) => <Notice key={item.title} {...item} />)}<Link href="/dashboard/marketing/ai-assistant" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">إعداد AI Assistant</Link></CardContent></Card>
        <Card><CardHeader><CardTitle>أعلى الحملات صرفًا</CardTitle><CardDescription>ابدأ مراجعتك من هنا.</CardDescription></CardHeader><CardContent className="space-y-2">{topCampaigns.length === 0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد حملات مسحوبة.</div> : topCampaigns.map((c) => <div key={`${c.platform}-${c.campaignId || c.campaignName}`} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{c.campaignName || c.campaignId || "حملة بدون اسم"}</b><span className="font-mono text-[#025EB8]">{money(c.spend, c.currency || "USD")}</span></div><div className="mt-1 text-xs text-slate-500">{c.platform} • نقرات {n(c.clicks)} • تحويلات {n(c.conversions)}</div></div>)}</CardContent></Card>
      </div>
    </>}
  </div>;
}

function Kpi({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon?: React.ReactNode }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{title}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div>{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</CardContent></Card>; }
function Notice({ title, body, tone }: { title: string; body: string; tone: "good" | "warn" | "bad" }) { const cls = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"; return <div className={`rounded-xl border p-3 ${cls}`}><div className="font-bold">{title}</div><div className="mt-1 text-sm leading-6">{body}</div></div>; }
