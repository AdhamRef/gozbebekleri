import Link from "next/link";
import { ArrowLeft, Link2, Megaphone, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Campaign Operating Center | لوحة التحكم",
};

type PerformanceRow = {
  id: string;
  name: string;
  platform: string | null;
  channel: string | null;
  url: string | null;
  status?: string;
  identifiers: {
    utmCampaign?: string | null;
    utmId?: string | null;
    campaignId?: string | null;
    adsetId?: string | null;
    adId?: string | null;
    targetCountry?: string | null;
  };
  recommendation?: { tone: "good" | "warning" | "danger" | "neutral"; label: string; action: string };
  performance: {
    donations: number;
    revenue: number;
    averageDonation: number;
    matchQuality: { strong: number; medium: number; weak: number };
  };
};

type PerformanceResponse = {
  ok: boolean;
  summary: {
    links: number;
    activeLinks?: number;
    linksWithDonations: number;
    donationsConsidered: number;
    revenueMatched: number;
  };
  links: PerformanceRow[];
};

function money(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function recommendationClass(tone?: string) {
  if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function linkHealth(row: PerformanceRow) {
  let score = 20;
  if (row.identifiers.utmCampaign) score += 20;
  if (row.identifiers.campaignId || row.identifiers.utmId) score += 20;
  if (row.identifiers.adsetId) score += 10;
  if (row.identifiers.adId) score += 15;
  if (row.identifiers.targetCountry) score += 10;
  if (row.performance.matchQuality.strong > 0) score += 15;
  return Math.min(100, score);
}

function detailHref(id: string) {
  return `/dashboard/marketing/campaign-links/${encodeURIComponent(id)}?days=30#performance`;
}

async function getCampaignOperatingData(): Promise<PerformanceResponse> {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const url = `${base}/api/admin/marketing-intelligence/campaign-links/performance?days=30&limit=100&status=ACTIVE`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => null) as PerformanceResponse | null;
    if (!res.ok || !data?.ok) throw new Error("failed");
    return data;
  } catch {
    return { ok: false, summary: { links: 0, activeLinks: 0, linksWithDonations: 0, donationsConsidered: 0, revenueMatched: 0 }, links: [] };
  }
}

export default async function CampaignOperatingCenterPage() {
  const data = await getCampaignOperatingData();
  const links = data.links ?? [];
  const healthyLinks = links.filter((item) => linkHealth(item) >= 75).length;
  const needsWork = links.filter((item) => linkHealth(item) < 60 || item.recommendation?.tone === "danger" || item.recommendation?.tone === "warning").slice(0, 8);
  const winners = links.filter((item) => item.performance.revenue > 0 && item.performance.matchQuality.strong > 0).slice(0, 6);

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-l from-slate-950 via-[#025EB8] to-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs text-white/70">Package 3 / Campaign Operating System</p>
        <h1 className="mt-1.5 text-2xl font-black">مركز تشغيل الحملات</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
          طبقة تنفيذية فوق Campaign Registry تربط الروابط المحفوظة بالتبرعات، جودة المطابقة، وأهم الإجراءات المطلوبة.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/link-generator" className="rounded-md bg-white px-3 py-2 text-sm font-bold text-[#025EB8] hover:bg-white/90">إنشاء رابط حملة</Link>
          <Link href="/dashboard/marketing/campaign-links" className="rounded-md border border-white/30 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">إدارة الروابط</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="روابط نشطة" value={data.summary.activeLinks ?? data.summary.links} icon={<Link2 className="h-5 w-5" />} />
        <SummaryCard title="جلبت تبرعات" value={data.summary.linksWithDonations} icon={<TrendingUp className="h-5 w-5" />} />
        <SummaryCard title="تبرعات مفحوصة" value={data.summary.donationsConsidered} icon={<Megaphone className="h-5 w-5" />} />
        <SummaryCard title="إيراد مطابق" value={money(data.summary.revenueMatched)} icon={<TrendingUp className="h-5 w-5" />} />
        <SummaryCard title="روابط صحية" value={healthyLinks} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>روابط رابحة</CardTitle>
            <CardDescription>روابط لديها إيراد ومطابقة قوية مع التبرعات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {winners.length > 0 ? winners.map((row) => (
              <LinkCard key={row.id} row={row} />
            )) : <Empty text="لا توجد روابط رابحة واضحة حتى الآن." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Queue</CardTitle>
            <CardDescription>روابط تحتاج تحسين قبل زيادة الميزانية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {needsWork.length > 0 ? needsWork.map((row) => (
              <div key={row.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-black text-slate-900">{row.name}</h2>
                  <Badge variant="outline" className={recommendationClass(row.recommendation?.tone)}>{row.recommendation?.label ?? "مراجعة"}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{row.recommendation?.action ?? "راجع بيانات الرابط وجودة المطابقة."}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="secondary">Health {linkHealth(row)}%</Badge>
                  <Badge variant="outline">{row.platform ?? "UNKNOWN"}</Badge>
                  <Badge variant="outline">Revenue {money(row.performance.revenue)}</Badge>
                </div>
                <Link href={detailHref(row.id)} className="mt-3 inline-flex rounded-md border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">فتح تفاصيل الأداء</Link>
              </div>
            )) : <Empty text="لا توجد إجراءات عاجلة على روابط الحملات." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>{title}</CardDescription><span className="text-[#025EB8]">{icon}</span></CardHeader><CardContent><CardTitle className="text-2xl">{value}</CardTitle></CardContent></Card>;
}

function LinkCard({ row }: { row: PerformanceRow }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black text-slate-900">{row.name}</h2><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">Health {linkHealth(row)}%</Badge></div><p className="mt-2 text-sm text-slate-600">{row.platform ?? "UNKNOWN"} · {row.channel ?? "—"}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary">{row.performance.donations} تبرعات</Badge><Badge variant="secondary">{money(row.performance.revenue)}</Badge><Badge variant="outline">Strong {row.performance.matchQuality.strong}</Badge></div><Link href={detailHref(row.id)} className="mt-3 inline-flex rounded-md border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">تفاصيل الأداء</Link></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border bg-slate-50 p-5 text-sm text-slate-600">{text}</div>;
}
