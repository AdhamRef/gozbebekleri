"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, BarChart3, Copy, Loader2, PlusCircle, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LinkStatus = "ACTIVE" | "ARCHIVED" | "DELETED" | "ALL";
type Tone = "good" | "warning" | "danger" | "neutral";

type CampaignLinkRow = {
  id: string;
  name: string;
  platform: string | null;
  channel: string | null;
  url: string | null;
  status?: "ACTIVE" | "ARCHIVED" | "DELETED";
  identifiers: { utmCampaign?: string | null; utmId?: string | null; campaignId?: string | null; adsetId?: string | null; adId?: string | null; targetCountry?: string | null };
  metadata?: { internalNotes?: string | null };
  recommendation?: { tone: Tone; label: string; action: string };
  performance: { donations: number; revenue: number; averageDonation: number; matchQuality: { strong: number; medium: number; weak: number }; matchReasons: Record<string, number> };
};

type ApiResponse = {
  ok: boolean;
  range: { from: string; to: string; days: number; dateBasis: string };
  summary: { links: number; activeLinks?: number; archivedLinks?: number; deletedLinks?: number; linksWithDonations: number; donationsConsidered: number; revenueMatched: number };
  links: CampaignLinkRow[];
};

const STATUSES: { value: LinkStatus; label: string }[] = [
  { value: "ACTIVE", label: "النشطة" },
  { value: "ARCHIVED", label: "المؤرشفة" },
  { value: "DELETED", label: "المحذوفة" },
  { value: "ALL", label: "الكل" },
];

const PLATFORMS = ["ALL", "META", "GOOGLE_ADS", "TIKTOK", "X", "EMAIL", "WHATSAPP", "SMS", "ORGANIC"];

function money(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";
}

function statusLabel(status?: string) {
  if (status === "ARCHIVED") return "مؤرشف";
  if (status === "DELETED") return "محذوف";
  return "نشط";
}

function statusClass(status?: string) {
  if (status === "ARCHIVED") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "DELETED") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function toneClass(tone?: Tone) {
  if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function healthScore(row: CampaignLinkRow) {
  let score = 20;
  if (row.identifiers.utmCampaign) score += 18;
  if (row.identifiers.campaignId || row.identifiers.utmId) score += 20;
  if (row.identifiers.adsetId) score += 10;
  if (row.identifiers.adId) score += 15;
  if (row.identifiers.targetCountry) score += 7;
  if (row.performance.matchQuality.strong > 0) score += 10;
  return Math.min(score, 100);
}

function firstIdentifier(row: CampaignLinkRow) {
  return row.identifiers.campaignId || row.identifiers.utmCampaign || row.identifiers.utmId || row.identifiers.adId || "—";
}

function missingIdentifierCount(row: CampaignLinkRow) {
  let missing = 0;
  if (!row.identifiers.campaignId && !row.identifiers.utmCampaign && !row.identifiers.utmId) missing += 1;
  if (!row.identifiers.adsetId) missing += 1;
  if (!row.identifiers.adId) missing += 1;
  if (!row.identifiers.targetCountry) missing += 1;
  return missing;
}

export default function CampaignLinksRegistryPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<LinkStatus>("ACTIVE");
  const [platform, setPlatform] = React.useState("ALL");
  const [days, setDays] = React.useState(30);
  const [query, setQuery] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days), limit: "150", status });
      if (platform !== "ALL") params.set("platform", platform);
      const res = await fetch(`/api/admin/marketing-intelligence/campaign-links/performance?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل سجل روابط الحملات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days, platform, status]);

  React.useEffect(() => { void load(); }, [load]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.links ?? []).filter((row) => {
      if (!q) return true;
      return [row.name, row.platform, row.channel, row.url, row.identifiers.campaignId, row.identifiers.utmCampaign, row.identifiers.adsetId, row.identifiers.adId, row.recommendation?.label, row.recommendation?.action].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [data?.links, query]);

  const revenue = rows.reduce((sum, row) => sum + row.performance.revenue, 0);
  const donations = rows.reduce((sum, row) => sum + row.performance.donations, 0);
  const needsData = rows.filter((row) => missingIdentifierCount(row) > 0).length;

  async function copyLink(url: string | null) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  }

  async function runAction(id: string, action: "ARCHIVE" | "DELETE" | "RESTORE") {
    if (action === "DELETE" && !window.confirm("سيتم نقل الرابط إلى قسم المحذوفة بدون حذف بياناته فعليًا. هل تريد المتابعة؟")) return;
    const label = action === "ARCHIVE" ? "الأرشفة" : action === "DELETE" ? "الحذف المنطقي" : "الاستعادة";
    setActionId(id);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/campaign-links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const json = await res.json().catch(() => null) as { ok?: boolean; matched?: number; error?: string } | null;
      if (!res.ok || !json?.ok || json.matched === 0) throw new Error(json?.error || "action failed");
      toast.success(`تم تنفيذ ${label}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `تعذر تنفيذ ${label}`);
    } finally {
      setActionId(null);
    }
  }

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="rounded-xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
      <p className="text-xs text-white/70">Campaign Registry Operations</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">سجل روابط الحملات</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">إدارة الروابط المحفوظة، مراجعة الأداء، النسخ، الأرشفة، الاستعادة، والحذف المنطقي من مكان واحد.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/link-generator" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-white/90"><PlusCircle className="h-4 w-4" />إنشاء رابط</Link>
          <Button type="button" onClick={load} variant="secondary" className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        </div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-4">
      <Metric title="روابط ظاهرة" value={rows.length} />
      <Metric title="تبرعات مطابقة" value={donations} tone="good" />
      <Metric title="إيراد مطابق" value={money(revenue)} />
      <Metric title="تحتاج بيانات" value={needsData} tone={needsData > 0 ? "warning" : "good"} />
    </div>

    <Card>
      <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الرابط، المنصة، Campaign ID، Ad ID، أو التوصية..." className="w-full rounded-md border bg-white px-3 py-2 text-sm" />
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">{PLATFORMS.map((item) => <option key={item} value={item}>{item === "ALL" ? "كل المنصات" : item}</option>)}</select>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border bg-white px-3 py-2 text-sm"><option value={7}>آخر 7 أيام</option><option value={14}>آخر 14 يوم</option><option value={30}>آخر 30 يوم</option><option value={60}>آخر 60 يوم</option><option value={90}>آخر 90 يوم</option></select>
      </CardContent>
    </Card>

    <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">{STATUSES.map((tab) => <button key={tab.value} type="button" onClick={() => setStatus(tab.value)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${status === tab.value ? "bg-[#025EB8] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{tab.label}</button>)}</div>

    {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : rows.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">لا توجد روابط مطابقة للفلاتر الحالية.</CardContent></Card> : <div className="space-y-3">
      {rows.map((row) => {
        const score = healthScore(row);
        return <div key={row.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-slate-950">{row.name}</h2>
                <Badge variant="outline" className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
                <Badge variant="outline" className={score >= 75 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : score >= 55 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}>Health {score}%</Badge>
              </div>
              <div className="mt-2 truncate text-xs text-slate-400" dir="ltr" title={row.url || ""}>{row.url || "—"}</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                <span><b className="text-slate-900">Platform:</b> {row.platform || "—"}</span>
                <span><b className="text-slate-900">ID:</b> <span dir="ltr">{firstIdentifier(row)}</span></span>
                <span><b className="text-slate-900">Donations:</b> {row.performance.donations}</span>
                <span><b className="text-slate-900">Revenue:</b> {money(row.performance.revenue)}</span>
              </div>
              <div className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${toneClass(row.recommendation?.tone)}`}><b>{row.recommendation?.label || "قيد المراقبة"}</b><div className="mt-1">{row.recommendation?.action || "راقب الأداء بعد وصول المزيد من البيانات."}</div></div>
            </div>
            <div className="flex min-w-[18rem] flex-wrap gap-2">
              <Link href={`/dashboard/marketing/campaign-links/${encodeURIComponent(row.id)}?days=${days}`} className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-bold hover:bg-slate-50"><BarChart3 className="h-3.5 w-3.5" />فتح الأداء</Link>
              <Button type="button" size="sm" variant="outline" onClick={() => copyLink(row.url)} className="gap-1"><Copy className="h-3.5 w-3.5" />نسخ</Button>
              {row.status !== "ARCHIVED" && row.status !== "DELETED" ? <Button type="button" size="sm" variant="outline" disabled={actionId === row.id} onClick={() => runAction(row.id, "ARCHIVE")} className="gap-1"><Archive className="h-3.5 w-3.5" />أرشفة</Button> : null}
              {row.status === "ARCHIVED" || row.status === "DELETED" ? <Button type="button" size="sm" variant="outline" disabled={actionId === row.id} onClick={() => runAction(row.id, "RESTORE")} className="gap-1"><RotateCcw className="h-3.5 w-3.5" />استعادة</Button> : null}
              {row.status !== "DELETED" ? <Button type="button" size="sm" variant="outline" disabled={actionId === row.id} onClick={() => runAction(row.id, "DELETE")} className="gap-1 text-rose-700 hover:text-rose-800"><Trash2 className="h-3.5 w-3.5" />حذف منطقي</Button> : null}
            </div>
          </div>
        </div>;
      })}
    </div>}
  </div>;
}

function Metric({ title, value, tone }: { title: string; value: string | number; tone?: "good" | "warning" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-slate-950";
  return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{title}</div><div className={`mt-1 text-2xl font-black ${color}`}>{value}</div></CardContent></Card>;
}
