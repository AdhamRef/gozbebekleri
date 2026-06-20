"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, Copy, ExternalLink, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Tone = "good" | "warning" | "danger" | "neutral";

type CampaignLinkDetail = {
  id: string;
  name: string;
  platform: string | null;
  channel: string | null;
  url: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: string | null;
  updatedAt?: string | null;
  identifiers: { utmCampaign?: string | null; utmId?: string | null; campaignId?: string | null; adsetId?: string | null; adId?: string | null; targetCountry?: string | null };
  metadata?: { objective?: string | null; audienceSegment?: string | null; messageVariant?: string | null; internalNotes?: string | null };
  recommendation?: { tone: Tone; label: string; action: string };
  performance: { donations: number; revenue: number; averageDonation: number; matchQuality: { strong: number; medium: number; weak: number }; matchReasons: Record<string, number> };
  samples?: Array<{ id: string; revenue: number; score: number; reasons: string[]; createdAt: string }>;
};

type ApiResponse = { ok: boolean; range: { from: string; to: string; days: number; dateBasis: string }; links: CampaignLinkDetail[] };

const LABELS: Record<string, string> = {
  campaign_id_or_utm_campaign: "Campaign ID أو UTM Campaign",
  adset_id: "Ad Set / Ad Group ID",
  ad_id: "Ad ID",
  target_country: "Target Country",
};

function money(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

function toneClass(tone?: Tone) {
  if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function healthScore(link: CampaignLinkDetail) {
  let score = 20;
  if (link.identifiers.utmCampaign) score += 18;
  if (link.identifiers.campaignId || link.identifiers.utmId) score += 20;
  if (link.identifiers.adsetId) score += 10;
  if (link.identifiers.adId) score += 15;
  if (link.identifiers.targetCountry) score += 7;
  if (link.performance.matchQuality.strong > 0) score += 10;
  return Math.min(score, 100);
}

function missingIdentifiers(link: CampaignLinkDetail) {
  const missing: string[] = [];
  if (!link.identifiers.campaignId && !link.identifiers.utmCampaign && !link.identifiers.utmId) missing.push("campaign_id_or_utm_campaign");
  if (!link.identifiers.adsetId) missing.push("adset_id");
  if (!link.identifiers.adId) missing.push("ad_id");
  if (!link.identifiers.targetCountry) missing.push("target_country");
  return missing;
}

function actionQueue(link: CampaignLinkDetail) {
  const missing = missingIdentifiers(link);
  const actions: Array<{ title: string; body: string; tone: Tone }> = [];
  if (link.status !== "ACTIVE") actions.push({ title: link.status === "ARCHIVED" ? "رابط مؤرشف" : "رابط محذوف منطقيًا", body: "لا تستخدمه في حملة جديدة إلا بعد الاستعادة.", tone: "neutral" });
  if (missing.includes("campaign_id_or_utm_campaign")) actions.push({ title: "Campaign identifier ناقص", body: "أضف Campaign ID أو UTM Campaign حتى تصبح المطابقة قابلة للاعتماد.", tone: "danger" });
  if (missing.includes("ad_id") && ["META", "GOOGLE_ADS", "TIKTOK", "X"].includes((link.platform || "").toUpperCase())) actions.push({ title: "Ad ID ناقص", body: "أضف Ad ID أو macro رسمي من المنصة لتحديد الإعلان الرابح.", tone: "warning" });
  if (link.performance.donations === 0 && (link.identifiers.campaignId || link.identifiers.adId || link.identifiers.utmCampaign)) actions.push({ title: "معرفات موجودة بدون تبرعات", body: "راجع الاستهداف أو صفحة الهبوط قبل زيادة الميزانية.", tone: "warning" });
  if (link.performance.donations > 0 && link.performance.matchQuality.strong === 0) actions.push({ title: "مطابقة غير قوية", body: "وحّد Campaign ID وAd ID بين الرابط والتبرع وأحداث التحويل.", tone: "warning" });
  if (actions.length === 0) actions.push({ title: "قيد المراقبة", body: "لا توجد مشكلة حرجة واضحة لهذا الرابط ضمن الفترة الحالية.", tone: "good" });
  return actions;
}

function identifierRows(link: CampaignLinkDetail) {
  return [
    ["UTM Campaign", link.identifiers.utmCampaign],
    ["UTM ID", link.identifiers.utmId],
    ["Campaign ID", link.identifiers.campaignId],
    ["Ad Set / Ad Group", link.identifiers.adsetId],
    ["Ad ID", link.identifiers.adId],
    ["Target Country", link.identifiers.targetCountry],
    ["Objective", link.metadata?.objective],
    ["Audience", link.metadata?.audienceSegment],
    ["Message Variant", link.metadata?.messageVariant],
  ] as const;
}

export default function CampaignLinkDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const [days, setDays] = React.useState(() => Number(searchParams.get("days") || 30));
  const [link, setLink] = React.useState<CampaignLinkDetail | null>(null);
  const [range, setRange] = React.useState<ApiResponse["range"] | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ days: String(days), limit: "500", status: "ALL" });
      const res = await fetch(`/api/admin/marketing-intelligence/campaign-links/performance?${query.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setLink((json.links || []).find((row) => row.id === id || encodeURIComponent(row.id) === id) ?? null);
      setRange(json.range);
    } catch {
      toast.error("تعذر تحميل تفاصيل الرابط");
      setLink(null);
      setRange(null);
    } finally {
      setLoading(false);
    }
  }, [days, id]);

  React.useEffect(() => { void load(); }, [load]);

  async function copyLink() {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  }

  if (loading) return <div className="flex min-h-[24rem] items-center justify-center" dir="rtl"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>;
  if (!link) return <div className="space-y-5 p-4 sm:p-6" dir="rtl"><Link href="/dashboard/marketing/campaign-links" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى سجل الروابط</Link><Card><CardContent className="p-8 text-center text-slate-500">لم أجد هذا الرابط داخل سجل الحملات.</CardContent></Card></div>;

  const score = healthScore(link);
  const missing = missingIdentifiers(link);
  const actions = actionQueue(link);
  const reasons = Object.entries(link.performance.matchReasons || {});

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing/campaign-links" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى سجل الروابط</Link>
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black text-slate-950">{link.name}</h1><Badge variant="outline">{link.status}</Badge><Badge variant="outline">{link.platform ?? "UNKNOWN"}</Badge></div>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">تفصيل أداء الرابط، جودة المطابقة، معرفات الحملة، والإجراء التالي قبل قرارات الميزانية.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border bg-white px-3 py-2 text-sm"><option value={7}>آخر 7 أيام</option><option value={14}>آخر 14 يوم</option><option value={30}>آخر 30 يوم</option><option value={60}>آخر 60 يوم</option><option value={90}>آخر 90 يوم</option></select>
        <Button type="button" variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        <Button type="button" variant="outline" onClick={copyLink} disabled={!link.url} className="gap-2"><Copy className="h-4 w-4" />نسخ الرابط</Button>
        {link.url ? <Button asChild className="gap-2"><a href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />فتح الرابط</a></Button> : null}
      </div>
    </div>

    {missing.length > 0 ? <Alert className="border-amber-200 bg-amber-50 text-amber-900"><ShieldAlert className="h-4 w-4" /><AlertTitle>بيانات ربط ناقصة</AlertTitle><AlertDescription>{missing.map((item) => LABELS[item] ?? item).join("، ")}</AlertDescription></Alert> : <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900"><ShieldCheck className="h-4 w-4" /><AlertTitle>بيانات الربط الأساسية مكتملة</AlertTitle><AlertDescription>لا توجد معرفات ناقصة ظاهرة لهذا الرابط.</AlertDescription></Alert>}

    <div className="grid gap-3 md:grid-cols-4"><Metric title="Health Score" value={`${score}%`} tone={score >= 75 ? "good" : score >= 55 ? "warning" : "danger"} /><Metric title="تبرعات مطابقة" value={link.performance.donations} /><Metric title="إيراد مطابق" value={money(link.performance.revenue)} /><Metric title="متوسط التبرع" value={money(link.performance.averageDonation)} /></div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card><CardHeader><CardTitle>جودة المطابقة</CardTitle><CardDescription>{range ? `الفترة: ${range.from} — ${range.to}` : "الفترة الحالية"}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><div className="flex items-center justify-between text-sm"><span>Health Score</span><b>{score}%</b></div><Progress value={score} /></div><div className="grid gap-3 sm:grid-cols-3"><Quality title="قوية" value={link.performance.matchQuality.strong} className="border-emerald-200 bg-emerald-50 text-emerald-800" /><Quality title="متوسطة" value={link.performance.matchQuality.medium} className="border-amber-200 bg-amber-50 text-amber-800" /><Quality title="ضعيفة" value={link.performance.matchQuality.weak} className="border-slate-200 bg-slate-50 text-slate-700" /></div><div className="rounded-xl border bg-slate-50 p-4"><div className="text-sm font-bold text-slate-900">أسباب المطابقة</div><div className="mt-3 flex flex-wrap gap-2">{reasons.length ? reasons.map(([reason, count]) => <Badge key={reason} variant="outline" className="bg-white">{reason}: {count}</Badge>) : <span className="text-sm text-slate-500">لا توجد أسباب مطابقة بعد.</span>}</div></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Action Queue</CardTitle><CardDescription>الإجراء العملي التالي لهذا الرابط.</CardDescription></CardHeader><CardContent className="space-y-3">{actions.map((item) => <div key={item.title} className={`rounded-xl border p-4 ${toneClass(item.tone)}`}><p className="font-black">{item.title}</p><p className="mt-2 text-sm leading-6">{item.body}</p></div>)}</CardContent></Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card><CardHeader><CardTitle>بيانات الرابط</CardTitle><CardDescription>المعرفات التي يعتمد عليها الربط مع التبرعات.</CardDescription></CardHeader><CardContent className="space-y-3">{identifierRows(link).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="max-w-[14rem] truncate font-mono text-xs text-slate-900" dir="ltr" title={value ?? ""}>{value || "—"}</span></div>)}{link.metadata?.internalNotes ? <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-600"><b className="text-slate-900">ملاحظات داخلية:</b> {link.metadata.internalNotes}</div> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>التبرعات المطابقة</CardTitle><CardDescription>عينات من التبرعات المرتبطة بهذا الرابط.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-right">Donation ID</th><th className="px-3 py-2 text-right">القيمة</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-right">الأسباب</th><th className="px-3 py-2 text-right">التاريخ</th></tr></thead><tbody>{link.samples?.length ? link.samples.map((sample) => <tr key={sample.id} className="border-t"><td className="px-3 py-2 font-mono text-xs">{sample.id}</td><td className="px-3 py-2">{money(sample.revenue)}</td><td className="px-3 py-2">{sample.score}</td><td className="px-3 py-2 text-xs text-slate-500">{sample.reasons.join(" · ") || "—"}</td><td className="px-3 py-2 text-xs text-slate-500">{dateLabel(sample.createdAt)}</td></tr>) : <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">لا توجد تبرعات مطابقة في الفترة المحددة.</td></tr>}</tbody></table></div></CardContent></Card>
    </div>
  </div>;
}

function Metric({ title, value, tone }: { title: string; value: string | number; tone?: "good" | "warning" | "danger" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "danger" ? "text-rose-700" : tone === "warning" ? "text-amber-700" : "text-slate-950";
  return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{title}</div><div className={`mt-1 text-2xl font-black ${color}`}>{value}</div></CardContent></Card>;
}

function Quality({ title, value, className }: { title: string; value: number; className: string }) {
  return <div className={`rounded-xl border p-4 ${className}`}><div className="text-xs">مطابقة {title}</div><div className="mt-1 text-2xl font-black">{value}</div></div>;
}
