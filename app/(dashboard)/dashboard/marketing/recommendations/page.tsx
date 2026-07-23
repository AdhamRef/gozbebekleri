import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, BadgeCheck, BrainCircuit, Lightbulb, Megaphone, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecommendationOverview } from "@/lib/ai/recommendations/recommendation-service";

export const metadata = { title: "التوصيات | لوحة التحكم" };
export const dynamic = "force-dynamic";

const priorityClass: Record<string, string> = { HIGH: "border-rose-200 bg-rose-50 text-rose-700", MEDIUM: "border-amber-200 bg-amber-50 text-amber-700", LOW: "border-slate-200 bg-slate-50 text-slate-700" };
const confidenceClass: Record<string, string> = { HIGH: "border-emerald-200 bg-emerald-50 text-emerald-700", MEDIUM: "border-blue-200 bg-blue-50 text-blue-700", LOW: "border-slate-200 bg-slate-50 text-slate-700" };
const typeIcon: Record<string, typeof TrendingUp> = { SCALE_WINNER: TrendingUp, IMPROVE_CREATIVE: Lightbulb, FIX_TRACKING: ShieldAlert, REUSE_ASSET: Sparkles, PAUSE_OR_REWORK: Megaphone, PREPARE_SEASON: BadgeCheck };

export default async function MarketingRecommendationsPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "ads");
  if (!access.allowed) redirect(access.redirectTo);
  const overview = await getRecommendationOverview();

  return <main className="space-y-5" dir="rtl">
    <header className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-xs text-white/70">التسويق / التوصيات</p><h1 className="mt-1 text-2xl font-black">التوصيات</h1><p className="mt-2 text-sm leading-6 text-white/85">توصيات مبنية على النتائج الفعلية. لا يتم تنفيذ ميزانية أو إيقاف حملة تلقائيًا.</p></div>
      <Link href="/dashboard/marketing/performance" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8]">أداء الحملات <ArrowLeft className="h-4 w-4" /></Link>
    </header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="كل التوصيات" value={overview.summary.total} /><Kpi label="عالية الأولوية" value={overview.summary.highPriority} /><Kpi label="التسويق" value={overview.summary.marketing} /><Kpi label="التشغيل والأرشيف" value={overview.summary.operations + overview.summary.archive} /></section>
    {overview.recommendations.length === 0 ? <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد توصيات مدعومة ببيانات كافية الآن.</CardContent></Card> : <section className="grid gap-4 xl:grid-cols-2">{overview.recommendations.map((item) => { const Icon = typeIcon[item.type] ?? BrainCircuit; return <Card key={item.id} className="overflow-hidden"><CardHeader className="border-b bg-slate-50"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="rounded-xl bg-white p-3 text-[#025EB8]"><Icon className="h-5 w-5" /></span><div><CardTitle className="text-lg">{item.title}</CardTitle><CardDescription>{item.area} · {item.type}</CardDescription></div></div><div className="flex gap-2"><Badge variant="outline" className={priorityClass[item.priority]}>{item.priority}</Badge><Badge variant="outline" className={confidenceClass[item.confidence]}>{item.confidence}</Badge></div></div></CardHeader><CardContent className="grid gap-3 p-4 lg:grid-cols-3"><Block title="السبب" text={item.reason} /><Block title="الإجراء المقترح" text={item.suggestedAction} /><Block title="الأثر المتوقع" text={item.expectedImpact} /></CardContent></Card>; })}</section>}
  </main>;
}
function Kpi({ label, value }: { label: string; value: number }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></CardContent></Card>; }
function Block({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border p-3"><p className="text-sm font-black">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>; }
