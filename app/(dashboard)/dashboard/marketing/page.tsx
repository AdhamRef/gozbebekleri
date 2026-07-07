"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, Wallet, Gauge, AlertTriangle, Megaphone, Radar, Loader2, ArrowLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CampaignRow = { platform: string; campaignId: string | null; campaignName: string | null; spend: number; clicks: number; conversions: number; revenue: number; currency: string | null };
type Overview = {
  ok: boolean;
  summary: { spend: number; siteRevenue: number; platformRevenue: number; siteRoas: number; platformRoas: number; siteDonations: number; activeConnections: number; totalConnections: number; failedSyncs: number };
  campaigns: CampaignRow[];
};
type Recommendation = { id: string; type: string; title: string; reason: string; action: string; confidence: string; priority: string };

function money(v: number | undefined, currency = "USD") {
  return typeof v === "number" && Number.isFinite(v) ? `${currency} ${Math.round(v).toLocaleString()}` : "—";
}
function roasText(v: number | undefined, spend: number | undefined) {
  return typeof spend === "number" && spend > 0 && typeof v === "number" ? `${v.toFixed(2)}x` : "لا توجد بيانات إنفاق";
}
const confidenceAr: Record<string, string> = { HIGH: "عالية", MEDIUM: "متوسطة", LOW: "منخفضة" };
function sourceAr(type: string) {
  if (type === "FIX_TRACKING") return "جودة التتبع";
  if (type === "PREPARE_SEASON") return "التقويم الموسمي";
  return "أداء الحملات";
}

export default function MarketingHomePage() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [recs, setRecs] = React.useState<Recommendation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [ov, rc] = await Promise.all([
          fetch("/api/admin/marketing-intelligence/overview?days=30", { cache: "no-store" }).then((r) => r.json().catch(() => null)),
          fetch("/api/admin/marketing-intelligence/recommendations", { cache: "no-store" }).then((r) => r.json().catch(() => null)),
        ]);
        setData(ov?.ok ? ov : null);
        setRecs(rc?.ok ? rc.recommendations ?? [] : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const s = data?.summary;
  const hasSpend = (s?.spend ?? 0) > 0;
  const trackingIssues = s?.failedSyncs ?? 0;
  const campaigns = [...(data?.campaigns ?? [])];
  const best = [...campaigns].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const worst = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => a.revenue / (a.spend || 1) - b.revenue / (b.spend || 1)).slice(0, 5);
  const spendNoRevenue = campaigns.filter((c) => c.spend > 0 && c.revenue === 0).length;

  // "ما يحتاج تدخل الآن" — real signals only, max 5.
  const issues: { tone: "bad" | "warn"; text: string; href: string; cta: string }[] = [];
  if (trackingIssues > 0) issues.push({ tone: "bad", text: `يوجد ${trackingIssues} مشكلة في سحب/تسليم التتبع — أصلحها قبل قرارات الميزانية.`, href: "/dashboard/conversion-events", cta: "فتح التتبع" });
  if ((s?.totalConnections ?? 0) === 0) issues.push({ tone: "warn", text: "لا توجد منصات مربوطة — اربط الحسابات لبدء قياس الأداء.", href: "/dashboard/marketing/connections", cta: "ربط المنصات" });
  if (spendNoRevenue > 0) issues.push({ tone: "bad", text: `${spendNoRevenue} حملة تنفق بلا عائد مسجّل — راجعها أو أوقفها.`, href: "/dashboard/marketing/insights", cta: "مراجعة الحملات" });
  if (hasSpend && (s?.siteRoas ?? 0) > 0 && (s?.siteRoas ?? 0) < 1) issues.push({ tone: "bad", text: "العائد الحقيقي أقل من الإنفاق — راجع الحملات الأعلى صرفًا.", href: "/dashboard/marketing/insights", cta: "مراجعة الأداء" });
  if (hasSpend && (s?.platformRevenue ?? 0) > 0 && (s?.siteRevenue ?? 0) === 0) issues.push({ tone: "warn", text: "المنصات تبلّغ عن عائد لكن لا يوجد إسناد على الموقع — راجع دقة التتبع.", href: "/dashboard/conversion-events", cta: "فتح التتبع" });
  const topIssues = issues.slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-slate-400">لوحة التحكم / التسويق</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">مركز التسويق والنمو</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">راقب الدخل الحقيقي، الإنفاق، جودة التتبع، وأداء الحملات من مكان واحد.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2"><Link href="/dashboard/link-generator"><Megaphone className="h-4 w-4" /> فتح الحملات والروابط</Link></Button>
          <Button asChild variant="outline" className="gap-2"><Link href="/dashboard/conversion-events"><Radar className="h-4 w-4" /> فحص التتبع</Link></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>
      ) : (
        <>
          {/* 4 decision cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DecisionCard label="الدخل الحقيقي" value={money(s?.siteRevenue)} hint={`${s?.siteDonations ?? 0} تبرع منسوب · آخر 30 يوم`} icon={TrendingUp} tone="text-emerald-600" />
            <DecisionCard label="الإنفاق الإعلاني" value={money(s?.spend)} hint={hasSpend ? "آخر 30 يوم" : "لا توجد بيانات إنفاق"} icon={Wallet} tone="text-slate-600" />
            <DecisionCard label="ROAS الحقيقي" value={roasText(s?.siteRoas, s?.spend)} hint={hasSpend ? "إيراد الموقع ÷ الإنفاق" : undefined} icon={Gauge} tone="text-[#025EB8]" />
            <DecisionCard label="مشاكل التتبع" value={trackingIssues > 0 ? String(trackingIssues) : "0"} hint={trackingIssues > 0 ? "تحتاج إصلاح" : "لا توجد مشاكل ظاهرة"} icon={AlertTriangle} tone={trackingIssues > 0 ? "text-rose-600" : "text-emerald-600"} />
          </section>

          {/* ما يحتاج تدخل الآن */}
          <section>
            <h2 className="mb-3 text-sm font-bold text-slate-500">ما يحتاج تدخل الآن</h2>
            {topIssues.length === 0 ? (
              <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-4 text-sm font-semibold text-emerald-800">لا توجد مشاكل واضحة الآن.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {topIssues.map((i, idx) => (
                  <div key={idx} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${i.tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <span>{i.text}</span>
                    <Link href={i.href} className="shrink-0 text-xs font-bold underline">{i.cta}</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* أفضل / تحتاج مراجعة */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CampaignList title="أفضل الحملات" rows={best} empty="لا توجد حملات مسحوبة بعد. اربط المنصات وشغّل سحب البيانات." />
            <CampaignList title="حملات تحتاج مراجعة" rows={worst} empty="لا توجد بيانات كافية بعد." />
          </div>

          {/* توصيات هذا الأسبوع */}
          <section>
            <h2 className="mb-3 text-sm font-bold text-slate-500">توصيات هذا الأسبوع</h2>
            {recs.length === 0 ? (
              <Card className="border-slate-200"><CardContent className="p-6 text-center text-sm text-slate-500">لا توجد توصيات كافية الآن — تحتاج بيانات حملات وتبرعات أكثر.</CardContent></Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {recs.map((r) => (
                  <Card key={r.id} className="border-slate-200"><CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex items-center gap-1.5 font-bold text-slate-800"><Lightbulb className="h-4 w-4 text-amber-500" /> {r.title}</p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">ثقة {confidenceAr[r.confidence] ?? r.confidence}</span>
                    </div>
                    <p className="text-xs leading-5 text-slate-500"><b className="text-slate-600">السبب:</b> {r.reason}</p>
                    <p className="text-xs leading-5 text-slate-700"><b>الإجراء:</b> {r.action}</p>
                    <p className="text-[11px] text-slate-400">المصدر: {sourceAr(r.type)}</p>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </section>

          {/* Secondary links */}
          <section>
            <h2 className="mb-3 text-sm font-bold text-slate-500">روابط سريعة</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "منشئ الحملات والروابط", href: "/dashboard/link-generator" },
                { label: "أحداث التحويل", href: "/dashboard/conversion-events" },
                { label: "نتائج التسويق", href: "/dashboard/marketing/results" },
                { label: "التوصيات", href: "/dashboard/marketing/recommendations" },
                { label: "ربط المنصات", href: "/dashboard/marketing/connections" },
                { label: "الأداء التفصيلي", href: "/dashboard/marketing/insights" },
              ].map((t) => (
                <Link key={t.href} href={t.href} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:border-[#025EB8]/40 hover:shadow-sm">
                  {t.label} <ArrowLeft className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function DecisionCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: typeof TrendingUp; tone: string }) {
  return (
    <Card className="border-slate-200"><CardContent className="p-5">
      <Icon className={`h-5 w-5 ${tone}`} />
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-600">{label}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-400">{hint}</div> : null}
    </CardContent></Card>
  );
}

function CampaignList({ title, rows, empty }: { title: string; rows: CampaignRow[]; empty: string }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-slate-500">{title}</h2>
      <Card className="border-slate-200"><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">{empty}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((c, i) => (
              <li key={`${c.platform}-${c.campaignId || c.campaignName || i}`} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-800">{c.campaignName || c.campaignId || "حملة"}</span>
                <span className="shrink-0 text-xs text-slate-400">{c.platform} · {money(c.revenue, c.currency || "USD")}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </section>
  );
}
