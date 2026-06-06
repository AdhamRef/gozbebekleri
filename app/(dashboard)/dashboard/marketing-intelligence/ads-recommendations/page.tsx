"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Database, DollarSign, Loader2, RefreshCw, Settings, TrendingUp, Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformRow = { platform: string; spend: number; impressions: number; clicks: number; conversions: number; revenue: number; currency: string | null };
type CampaignRow = PlatformRow & { campaignId: string | null; campaignName: string | null };
type ConnectionRow = { id: string; platform: string; name: string; accountId: string | null; accountName: string | null; status: string; enabled: boolean; lastSyncAt: string | null; lastError: string | null; defaultCurrency: string | null };
type SyncRun = { id: string; platform: string; accountId: string | null; status: string; rowsFetched: number; error: string | null; startedAt: string; finishedAt: string | null };
type Overview = {
  ok: boolean;
  range: { days: number; from: string; to: string };
  summary: { spend: number; platformRevenue: number; platformConversions: number; platformClicks: number; platformImpressions: number; siteRevenue: number; allSiteRevenue: number; siteDonations: number; allPaidDonations: number; platformRoas: number; siteRoas: number; activeConnections: number; totalConnections: number; successSyncs: number; failedSyncs: number };
  platforms: PlatformRow[];
  campaigns: CampaignRow[];
  connections: ConnectionRow[];
  syncRuns: SyncRun[];
};

function money(value: number | null | undefined, currency = "USD") { return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}` : "—"; }
function number(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—"; }
function roas(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}x` : "—"; }
function statusTone(status: string) { if (["SUCCESS", "PARTIAL_SUCCESS", "ACTIVE"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700"; if (["FAILED", "AUTH_ERROR", "PERMISSION_ERROR", "SYNC_ERROR"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-700"; return "border-amber-200 bg-amber-50 text-amber-700"; }
function statusLabel(status: string) { if (status === "SUCCESS") return "ناجح"; if (status === "PARTIAL_SUCCESS") return "جزئي"; if (status === "FAILED") return "فشل"; if (status === "MISSING_CONFIG") return "إعداد ناقص"; if (status === "NOT_IMPLEMENTED") return "غير مفعّل"; if (status === "ACTIVE") return "نشط"; if (status === "DISABLED") return "مغلق"; return status; }

export default function AdsRecommendationsPage() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(7);

  const load = React.useCallback(async (targetDays = days) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing-intelligence/overview?days=${targetDays}`, { cache: "no-store" });
      const json = await res.json().catch(() => null) as Overview | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل بيانات الإعلانات والتوصيات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => { void load(days); }, []);

  const topCampaigns = [...(data?.campaigns ?? [])].sort((a, b) => b.spend - a.spend).slice(0, 8);
  const wasteCampaigns = topCampaigns.filter((row) => row.spend > 0 && row.conversions === 0).slice(0, 5);
  const lastSync = data?.syncRuns?.[0] ?? null;

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-white/75">التسويق</p><h1 className="mt-2 text-3xl font-black">الإعلانات والتوصيات</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-white/85">الصرف، التبرعات، ROAS، الحسابات الإعلانية، وأهم التنبيهات في صفحة واحدة سهلة.</p></div><div className="flex flex-wrap gap-2">{[7, 14, 30].map((d) => <Button key={d} variant={days === d ? "secondary" : "outline"} className={days === d ? "" : "border-white/30 bg-white/10 text-white hover:bg-white/20"} onClick={() => { setDays(d); void load(d); }}>{d} يوم</Button>)}<Button variant="secondary" onClick={() => load(days)} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button></div></div>
    </div>

    {loading ? <div className="flex min-h-[22rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات متاحة.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><Kpi icon={<DollarSign className="h-4 w-4" />} label="الصرف" value={money(data.summary.spend)} /><Kpi icon={<TrendingUp className="h-4 w-4" />} label="تبرعات الإعلانات" value={money(data.summary.siteRevenue)} hint={`${data.summary.siteDonations} تبرع`} /><Kpi icon={<BarChart3 className="h-4 w-4" />} label="ROAS الحقيقي" value={roas(data.summary.siteRoas)} /><Kpi icon={<Zap className="h-4 w-4" />} label="تحويلات المنصات" value={number(data.summary.platformConversions)} hint={money(data.summary.platformRevenue)} /><Kpi icon={<Database className="h-4 w-4" />} label="الحسابات" value={`${data.summary.activeConnections}/${data.summary.totalConnections}`} hint="نشط/إجمالي" /><Kpi icon={<Clock className="h-4 w-4" />} label="آخر مزامنة" value={lastSync ? statusLabel(lastSync.status) : "—"} hint={lastSync ? new Date(lastSync.startedAt).toLocaleString() : "لا يوجد"} /></div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]"><Card><CardHeader><CardTitle>الحسابات الإعلانية والصرف</CardTitle><CardDescription>ملخص المنصات المتصلة وما تم سحبه من بيانات الإنفاق والتحويلات.</CardDescription></CardHeader><CardContent className="space-y-3">{data.platforms.length === 0 ? <Empty text="لا توجد بيانات صرف مسحوبة بعد. افتح ربط المنصات أو استورد بيانات المنصات." /> : data.platforms.map((row) => <div key={`${row.platform}-${row.currency ?? ""}`} className="rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold text-slate-950">{row.platform}</div><div className="font-mono text-sm font-bold text-[#025EB8]">{money(row.spend, row.currency ?? "USD")}</div></div><div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-4"><span>ظهور: {number(row.impressions)}</span><span>نقرات: {number(row.clicks)}</span><span>تحويلات: {number(row.conversions)}</span><span>قيمة: {money(row.revenue, row.currency ?? "USD")}</span></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle>حالة الربط والمزامنة</CardTitle><CardDescription>هل الحسابات موجودة؟ وهل آخر مزامنة نجحت؟</CardDescription></CardHeader><CardContent className="space-y-3">{data.connections.length === 0 ? <Empty text="لا توجد حسابات إعلانية مربوطة حتى الآن." /> : data.connections.slice(0, 8).map((connection) => <div key={connection.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold text-slate-900">{connection.name}</div><span className={`rounded-full border px-2 py-1 text-xs ${statusTone(connection.status)}`}>{statusLabel(connection.status)}</span></div><div className="mt-1 text-xs text-slate-500">{connection.platform} • {connection.accountName || connection.accountId || "بدون حساب"}</div><div className="mt-1 text-xs text-slate-500">آخر مزامنة: {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : "لم تتم"}</div>{connection.lastError ? <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{connection.lastError}</div> : null}</div>)}</CardContent></Card></div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]"><Card><CardHeader><CardTitle>أهم الحملات حسب الصرف</CardTitle><CardDescription>قائمة مختصرة بدل عشرات الصفحات.</CardDescription></CardHeader><CardContent className="space-y-2">{topCampaigns.length === 0 ? <Empty text="لا توجد حملات مسحوبة حتى الآن." /> : topCampaigns.map((row) => <div key={`${row.platform}-${row.campaignId ?? row.campaignName}`} className="grid gap-2 rounded-xl border p-3 text-sm md:grid-cols-[1fr_auto]"><div><div className="font-bold text-slate-900">{row.campaignName || row.campaignId || "حملة بدون اسم"}</div><div className="mt-1 text-xs text-slate-500">{row.platform} • نقرات {number(row.clicks)} • تحويلات {number(row.conversions)}</div></div><div className="text-left font-mono font-bold text-[#025EB8]">{money(row.spend, row.currency ?? "USD")}</div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />تنبيهات وتوصيات مختصرة</CardTitle><CardDescription>الأهم فقط، بدون تفاصيل فنية مزعجة.</CardDescription></CardHeader><CardContent className="space-y-3">{data.summary.spend === 0 ? <Notice tone="warn" text="لا يوجد صرف ظاهر في الفترة الحالية. قد تحتاج مزامنة Meta أو استيراد بيانات المنصات." /> : null}{data.summary.totalConnections === 0 ? <Notice tone="warn" text="لا توجد حسابات إعلانية مربوطة. اربط الحسابات حتى تظهر بيانات الصرف تلقائيًا." /> : null}{data.summary.failedSyncs > 0 ? <Notice tone="bad" text={`يوجد ${data.summary.failedSyncs} محاولة مزامنة فشلت أو ناقصة الإعداد.`} /> : null}{wasteCampaigns.map((row) => <Notice key={`${row.platform}-${row.campaignId}`} tone="bad" text={`${row.campaignName || row.campaignId || "حملة"}: صرف ${money(row.spend, row.currency ?? "USD")} بدون تحويلات منصة ظاهرة.`} />)}{data.summary.spend > 0 && data.summary.siteRoas >= 2 ? <Notice tone="good" text="ROAS الحقيقي جيد. راقب الحملات الرابحة قبل زيادة الميزانية تدريجيًا." /> : null}{data.summary.spend > 0 && data.summary.siteRoas < 1 ? <Notice tone="bad" text="ROAS الحقيقي أقل من 1. راجع الحملات والروابط قبل زيادة الصرف." /> : null}<div className="flex flex-wrap gap-2 pt-2"><Link href="/dashboard/ads" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"><CheckCircle2 className="h-4 w-4" />فتح تحليل الإعلانات التفصيلي</Link><Link href="/dashboard/link-generator" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"><Zap className="h-4 w-4" />إنشاء رابط</Link></div></CardContent></Card></div>
    </>}
  </div>;
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div>{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</CardContent></Card>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{text}</div>; }
function Notice({ text, tone }: { text: string; tone: "good" | "warn" | "bad" }) { const cls = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"; return <div className={`rounded-xl border p-3 text-sm leading-6 ${cls}`}>{text}</div>; }
