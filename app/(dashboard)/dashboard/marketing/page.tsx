"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, Wallet, Gauge, AlertTriangle, Megaphone, Radar, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CampaignRow = { platform: string; campaignId: string | null; campaignName: string | null; spend: number; clicks: number; conversions: number; revenue: number; currency: string | null };
type Overview = {
  ok: boolean;
  summary: { spend: number; siteRevenue: number; platformRevenue: number; siteRoas: number; platformRoas: number; siteDonations: number; activeConnections: number; totalConnections: number; failedSyncs: number };
  campaigns: CampaignRow[];
};

function money(v: number | undefined, currency = "USD") {
  return typeof v === "number" && Number.isFinite(v) ? `${currency} ${Math.round(v).toLocaleString()}` : "—";
}
function roas(v: number | undefined, spend: number | undefined) {
  return typeof spend === "number" && spend > 0 && typeof v === "number" ? `${v.toFixed(2)}x` : "غير متاح";
}

export default function MarketingHomePage() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/marketing-intelligence/overview?days=30", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as Overview | null;
        setData(json?.ok ? json : null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const s = data?.summary;
  const hasSpend = (s?.spend ?? 0) > 0;
  const campaigns = [...(data?.campaigns ?? [])];
  const best = [...campaigns].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const worst = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => a.revenue / (a.spend || 1) - b.revenue / (b.spend || 1)).slice(0, 4);

  const issues: { tone: string; text: string; href: string; cta: string }[] = [];
  if ((s?.failedSyncs ?? 0) > 0) issues.push({ tone: "bad", text: "يوجد فشل في سحب البيانات — أصلح التتبع قبل قرارات الميزانية.", href: "/dashboard/conversion-events", cta: "فتح التتبع" });
  if ((s?.totalConnections ?? 0) === 0) issues.push({ tone: "warn", text: "لا توجد منصات مربوطة — اربط الحسابات لبدء قياس الأداء.", href: "/dashboard/marketing/connections", cta: "ربط المنصات" });
  if (hasSpend && (s?.siteRoas ?? 0) > 0 && (s?.siteRoas ?? 0) < 1) issues.push({ tone: "bad", text: "العائد الحقيقي أقل من الإنفاق — راجع الحملات الأعلى صرفًا.", href: "/dashboard/marketing/insights", cta: "مراجعة الأداء" });

  const cards = [
    { label: "الدخل الحقيقي", value: money(s?.siteRevenue), icon: TrendingUp, tone: "text-emerald-600" },
    { label: "الإنفاق", value: money(s?.spend), icon: Wallet, tone: "text-slate-600" },
    { label: "ROAS الحقيقي", value: roas(s?.siteRoas, s?.spend), icon: Gauge, tone: "text-[#025EB8]" },
    { label: "مشاكل التتبع", value: String(s?.failedSyncs ?? 0), icon: AlertTriangle, tone: (s?.failedSyncs ?? 0) > 0 ? "text-rose-600" : "text-slate-400" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-slate-400">النمو / التسويق</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">مركز التسويق والنمو</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">راقب أداء الحملات، التتبع، والنتائج الحقيقية من مكان واحد.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2"><Link href="/dashboard/link-generator"><Megaphone className="h-4 w-4" /> فتح الحملات</Link></Button>
          <Button asChild variant="outline" className="gap-2"><Link href="/dashboard/conversion-events"><Radar className="h-4 w-4" /> فحص التتبع</Link></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label} className="border-slate-200"><CardContent className="p-5">
                  <div className="flex items-center justify-between"><Icon className={`h-5 w-5 ${c.tone}`} /></div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{c.value}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{c.label}</div>
                </CardContent></Card>
              );
            })}
          </section>

          {!hasSpend ? (
            <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm leading-6 text-amber-900">توجد تبرعات لكن لا توجد بيانات إنفاق مسحوبة لهذه الفترة، لذلك ROAS غير محسوب الآن. اربط المنصات أو شغّل سحب البيانات.</CardContent></Card>
          ) : null}

          {issues.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-500">ما يحتاج تدخل الآن</h2>
              <div className="space-y-2">
                {issues.map((i, idx) => (
                  <div key={idx} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${i.tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <span>{i.text}</span>
                    <Link href={i.href} className="shrink-0 text-xs font-bold underline">{i.cta}</Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <CampaignList title="أفضل الحملات" rows={best} empty="لا توجد حملات مسحوبة بعد." />
            <CampaignList title="أسوأ الحملات" rows={worst} empty="لا توجد بيانات كافية." />
          </div>

          <section>
            <h2 className="mb-3 text-sm font-bold text-slate-500">أدوات</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "الأداء والتوصيات", href: "/dashboard/marketing/insights" },
                { label: "ربط المنصات", href: "/dashboard/marketing/connections" },
                { label: "أحداث التحويل", href: "/dashboard/conversion-events" },
                { label: "منشئ الحملات والروابط", href: "/dashboard/link-generator" },
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
