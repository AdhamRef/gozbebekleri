import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AlertTriangle, ArrowLeft, BarChart3, Gauge, Link2, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { getMarketingResultsOverview } from "@/lib/marketing/results/results-service";
import { getRecommendationOverview } from "@/lib/ai/recommendations/recommendation-service";
import { getAdAccountsReadiness, getTrackingReadiness } from "@/lib/platform-connections/readiness";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "نظرة عامة على التسويق | لوحة التحكم" };
export const dynamic = "force-dynamic";

function money(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "غير متاح";
}

export default async function MarketingOverviewPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "ads");
  if (!access.allowed) redirect(access.redirectTo);

  const [results, recommendations, accounts, tracking] = await Promise.all([
    getMarketingResultsOverview(),
    getRecommendationOverview(),
    getAdAccountsReadiness(),
    getTrackingReadiness(),
  ]);

  const bestCampaign = [...results.results].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
  const topRecommendation = recommendations.recommendations[0] ?? null;
  const lastSyncAt = accounts.rows
    .map((row) => row.lastSyncAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const costPerResult = results.summary.totalDonations > 0
    ? results.summary.totalSpend / results.summary.totalDonations
    : null;
  const roas = results.summary.totalSpend > 0
    ? results.summary.totalRevenue / results.summary.totalSpend
    : null;

  return (
    <main className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold text-[#025EB8]">التسويق / نظرة عامة</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">نظرة عامة</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">ملخص تنفيذي سريع للأداء الفعلي، التتبع، وآخر مزامنة دون تكرار الجداول التفصيلية.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm font-bold">
          <Link className="rounded-md border px-3 py-2 hover:bg-slate-50" href="/dashboard/marketing/performance">أداء الحملات</Link>
          <Link className="rounded-md border px-3 py-2 hover:bg-slate-50" href="/dashboard/marketing/recommendations">التوصيات</Link>
        </nav>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="إجمالي الإنفاق" value={money(results.summary.totalSpend)} icon={<Wallet className="h-5 w-5" />} />
        <Metric label="قيمة التحويلات" value={money(results.summary.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <Metric label="عدد التحويلات" value={results.summary.totalDonations.toLocaleString()} icon={<BarChart3 className="h-5 w-5" />} />
        <Metric label="تكلفة النتيجة" value={costPerResult === null ? "غير متاح" : money(costPerResult)} icon={<Gauge className="h-5 w-5" />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardDescription>ROAS الحقيقي</CardDescription><CardTitle>{roas === null ? "غير متاح" : `${roas.toFixed(2)}x`}</CardTitle></CardHeader>
          <CardContent className="text-xs text-slate-500">يُحسب فقط عند وجود إنفاق وإيراد منسوب فعليًا.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>أفضل حملة</CardDescription><CardTitle className="text-base">{bestCampaign?.campaignTitle ?? "لا توجد بيانات كافية"}</CardTitle></CardHeader>
          <CardContent className="text-xs text-slate-500">{bestCampaign ? `${money(bestCampaign.revenue)} · ${bestCampaign.channel}` : "اربط المنصات وشغّل المزامنة عند الحاجة."}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>آخر مزامنة ناجحة/مسجلة</CardDescription><CardTitle className="text-base">{lastSyncAt ? new Date(lastSyncAt).toLocaleString("ar") : "غير متاح"}</CardTitle></CardHeader>
          <CardContent className="text-xs text-slate-500">الحسابات المتصلة: {accounts.connectedCount}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />حالة التتبع</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{tracking.configuredCount} من {tracking.total} تكاملات تتبع مُعدّة.</p>
            <Link href="/dashboard/marketing/tracking" className="inline-flex items-center gap-1 font-bold text-[#025EB8]">فتح التتبع والتحويلات <ArrowLeft className="h-4 w-4" /></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" />أهم توصية</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {topRecommendation ? <><p className="font-bold text-slate-900">{topRecommendation.title}</p><p className="leading-6 text-slate-600">{topRecommendation.reason}</p></> : <p className="text-slate-500">لا توجد توصيات مدعومة ببيانات كافية الآن.</p>}
            <Link href="/dashboard/marketing/recommendations" className="inline-flex items-center gap-1 font-bold text-[#025EB8]">عرض كل التوصيات <ArrowLeft className="h-4 w-4" /></Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Quick href="/dashboard/marketing/performance" label="أداء الحملات" icon={<BarChart3 className="h-4 w-4" />} />
        <Quick href="/dashboard/marketing/attribution" label="الروابط والإسناد" icon={<Link2 className="h-4 w-4" />} />
        <Quick href="/dashboard/marketing/tracking" label="التتبع والتحويلات" icon={<Gauge className="h-4 w-4" />} />
        <Quick href="/dashboard/platform-connections" label="ربط المنصات" icon={<ArrowLeft className="h-4 w-4" />} />
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <Card><CardContent className="p-5"><span className="text-[#025EB8]">{icon}</span><div className="mt-3 text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></CardContent></Card>;
}

function Quick({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <Link href={href} className="flex items-center justify-between rounded-xl border bg-white p-4 text-sm font-bold text-slate-700 hover:border-[#025EB8]/40"><span className="flex items-center gap-2">{icon}{label}</span><ArrowLeft className="h-4 w-4 text-slate-400" /></Link>;
}
