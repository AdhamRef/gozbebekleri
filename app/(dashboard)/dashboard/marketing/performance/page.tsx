import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { getMarketingResultsOverview } from "@/lib/marketing/results/results-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "أداء الحملات | لوحة التحكم" };
export const dynamic = "force-dynamic";

function money(value: number) { return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

export default async function CampaignPerformancePage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "ads");
  if (!access.allowed) redirect(access.redirectTo);
  const overview = await getMarketingResultsOverview();

  return <main className="space-y-5" dir="rtl">
    <header><p className="text-xs font-bold text-brand">التسويق / أداء الحملات</p><h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">أداء الحملات</h1><p className="mt-2 text-sm leading-6 text-slate-500">قراءة موحدة للحملات من بيانات الإنفاق الفعلية وإسناد التبرعات داخل الموقع.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="الإنفاق" value={money(overview.summary.totalSpend)} />
      <Kpi label="قيمة التحويلات" value={money(overview.summary.totalRevenue)} />
      <Kpi label="التحويلات" value={String(overview.summary.totalDonations)} />
      <Kpi label="متوسط ROAS" value={overview.summary.totalSpend > 0 ? `${overview.summary.averageRoas.toFixed(2)}x` : "غير متاح"} />
    </section>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand" />الحملات</CardTitle><CardDescription>لا تُعرض قيمة صفرية كبيان متاح عندما لا يوجد إنفاق؛ تظهر الحالة «غير متاح».</CardDescription></CardHeader>
      <CardContent className="p-0">
        {overview.results.length === 0 ? <EmptyState variant="inline" icon={BarChart3} title="لا توجد بيانات حملات لهذه الفترة" description="لم تُسجَّل أي حملة فعلية ضمن النطاق الزمني المحدد. جرّب توسيع الفترة أو تأكّد من ربط الحسابات الإعلانية." /> :<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-right">الحملة</th><th className="p-3 text-right">المنصة</th><th className="p-3 text-right">الإنفاق</th><th className="p-3 text-right">النقرات</th><th className="p-3 text-right">التحويلات</th><th className="p-3 text-right">قيمة التحويلات</th><th className="p-3 text-right">تكلفة النتيجة</th><th className="p-3 text-right">ROAS</th><th className="p-3 text-right">الحالة</th></tr></thead><tbody className="divide-y">{overview.results.map((row) => <tr key={row.id}><td className="p-3 font-bold text-slate-900">{row.campaignTitle}</td><td className="p-3">{row.channel}</td><td className="p-3">{row.spend > 0 ? money(row.spend) : "غير متاح"}</td><td className="p-3">{row.clicks.toLocaleString()}</td><td className="p-3">{row.donations.toLocaleString()}</td><td className="p-3">{money(row.revenue)}</td><td className="p-3">{row.donations > 0 && row.spend > 0 ? money(row.spend / row.donations) : "غير متاح"}</td><td className="p-3">{row.spend > 0 ? `${row.roas.toFixed(2)}x` : "غير متاح"}</td><td className="p-3"><Badge variant="outline">{row.status}</Badge></td></tr>)}</tbody></table></div>}
      </CardContent>
    </Card>
    <p className="text-xs leading-6 text-slate-500">مستويات Ad Set وAd تظهر فقط عندما تتوفر بيانات فعلية في مصادر المزامنة؛ لا يتم إنشاء أرقام تقديرية أو وهمية.</p>
  </main>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></CardContent></Card>; }
