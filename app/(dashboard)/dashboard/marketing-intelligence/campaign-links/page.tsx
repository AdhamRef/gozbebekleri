"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CampaignLinkPerformanceRow = {
  id: string;
  name: string;
  platform: string | null;
  channel: string | null;
  url: string | null;
  createdAt: string | null;
  identifiers: {
    utmCampaign?: string | null;
    utmId?: string | null;
    campaignId?: string | null;
    adsetId?: string | null;
    adId?: string | null;
    targetCountry?: string | null;
  };
  performance: {
    donations: number;
    revenue: number;
    averageDonation: number;
    matchQuality: { strong: number; medium: number; weak: number };
    matchReasons: Record<string, number>;
  };
};

type ApiResponse = {
  ok: boolean;
  range: { from: string; to: string; days: number; dateBasis: string };
  links: CampaignLinkPerformanceRow[];
  summary: {
    links: number;
    linksWithDonations: number;
    donationsConsidered: number;
    revenueMatched: number;
  };
};

function money(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "—";
}

function firstIdentifier(row: CampaignLinkPerformanceRow) {
  return row.identifiers.campaignId
    || row.identifiers.utmCampaign
    || row.identifiers.utmId
    || row.identifiers.adId
    || "—";
}

function reasonsLabel(row: CampaignLinkPerformanceRow) {
  const entries = Object.entries(row.performance.matchReasons || {}).slice(0, 4);
  if (entries.length === 0) return "—";
  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ");
}

export default function CampaignLinksPerformancePage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(7);
  const [platform, setPlatform] = React.useState("META");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days), limit: "100" });
      if (platform !== "ALL") params.set("platform", platform);
      const res = await fetch(`/api/admin/marketing-intelligence/campaign-links/performance?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل أداء روابط الحملات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days, platform]);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowRight className="h-4 w-4" /> العودة إلى ذكاء التسويق
        </Link>
        <h1 className="text-2xl font-black text-slate-950">أداء روابط الحملات</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          يربط هذا التقرير بين الروابط المحفوظة في Campaign Registry والتبرعات الفعلية حسب campaign/ad/UTM، بدون تغيير أرقام الصفحة الرئيسية.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="META">Meta</option>
          <option value="GOOGLE_ADS">Google Ads</option>
          <option value="TIKTOK">TikTok</option>
          <option value="X">X</option>
          <option value="ALL">كل المنصات</option>
        </select>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value={1}>اليوم</option>
          <option value={7}>آخر 7 أيام</option>
          <option value={14}>آخر 14 يوم</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={60}>آخر 60 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات متاحة.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">الروابط المحفوظة</div><div className="mt-1 text-2xl font-black">{data.summary.links}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">روابط جلبت تبرعات</div><div className="mt-1 text-2xl font-black text-emerald-700">{data.summary.linksWithDonations}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">تبرعات تمت مراجعتها</div><div className="mt-1 text-2xl font-black">{data.summary.donationsConsidered}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">إيراد مطابق</div><div className="mt-1 text-2xl font-black">{money(data.summary.revenueMatched)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أفضل روابط الحملات</CardTitle>
          <CardDescription>الفترة: {data.range.from} — {data.range.to}. المطابقة تعتمد على campaign_id / ad_id / adset_id / UTM.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-right">الرابط</th>
                  <th className="px-3 py-2 text-right">المنصة</th>
                  <th className="px-3 py-2 text-right">المعرّف</th>
                  <th className="px-3 py-2 text-right">التبرعات</th>
                  <th className="px-3 py-2 text-right">الإيراد</th>
                  <th className="px-3 py-2 text-right">متوسط التبرع</th>
                  <th className="px-3 py-2 text-right">جودة المطابقة</th>
                  <th className="px-3 py-2 text-right">أسباب المطابقة</th>
                </tr>
              </thead>
              <tbody>
                {data.links.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">لا توجد روابط محفوظة بعد.</td></tr> : data.links.map((row) => <tr key={row.id} className="border-t">
                  <td className="max-w-[22rem] px-3 py-2">
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{row.url || "—"}</div>
                  </td>
                  <td className="px-3 py-2">{row.platform || "—"}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 font-mono text-xs">{firstIdentifier(row)}</td>
                  <td className="px-3 py-2 font-bold">{row.performance.donations}</td>
                  <td className="px-3 py-2">{money(row.performance.revenue)}</td>
                  <td className="px-3 py-2">{money(row.performance.averageDonation)}</td>
                  <td className="px-3 py-2 text-xs">
                    قوي: {row.performance.matchQuality.strong} · متوسط: {row.performance.matchQuality.medium} · ضعيف: {row.performance.matchQuality.weak}
                  </td>
                  <td className="max-w-[20rem] truncate px-3 py-2 text-xs text-slate-500">{reasonsLabel(row)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>}
  </div>;
}
