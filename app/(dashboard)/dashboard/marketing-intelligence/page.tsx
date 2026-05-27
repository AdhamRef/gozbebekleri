"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformHealth = { platform: string; label: string; ready: boolean; missing: string[] };
type RecentEvent = { _id?: { $oid?: string }; id?: string; platform?: string; eventName?: string; channel?: string; status?: string; attempts?: number; error?: string | null; donationId?: string; value?: number; currency?: string };
type AttributionSignals = { fbclid: boolean; fbc: boolean; fbp: boolean; utm: boolean; campaign: boolean; ad: boolean; adset: boolean; quality: "strong" | "medium" | "weak"; warnings: string[] };
type RetryResult = { donationId: string; paidAt: string | null; amount: number; currency: string; wasAlreadyMarkedSent?: boolean; attribution?: AttributionSignals; result?: { ok?: boolean; skipped?: boolean; reason?: string; error?: string; fbtrace_id?: string } };
type RetrySummary = { ok?: boolean; scanned?: number; considered?: number; limit?: number; days?: number; results?: RetryResult[] };
type Health = {
  scores: { readiness: number; delivery: number; overall: number };
  platforms: PlatformHealth[];
  donations: { checkoutRowsLast7d: number; paidLast7d: number; failedLast7d: number; missingServerConversions: number };
  conversionEvents: { sentLast7d: number; failedLast7d: number; skippedLast7d: number; recent: RecentEvent[] };
  links: { campaignBuilder: string; ads: string; pixels: string; connections: string };
};
type ReconciliationRow = {
  key: string;
  label: string;
  siteDonations: number;
  siteRevenue: number;
  platformSpend: number;
  platformReportedConversions: number;
  platformReportedValue: number;
  actualRoas: number | null;
  platformRoas: number | null;
  conversionGap: number;
  valueGap: number;
};
type Reconciliation = {
  ok: boolean;
  platform: string;
  range: { from: string; to: string; days: number };
  summary: {
    sitePaidDonations: number;
    siteRevenue: number;
    platformSpend: number;
    platformReportedConversions: number;
    platformReportedValue: number;
    actualRoas: number | null;
    platformRoas: number | null;
    attribution: { strong: number; medium: number; weak: number };
    countryMismatchCount: number;
  };
  rows: ReconciliationRow[];
  recommendations: string[];
};

function ScoreCard({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const status = safeValue >= 85 ? "ممتاز" : safeValue >= 60 ? "يحتاج متابعة" : "خطر";
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className="rounded-full border px-2 py-1 text-xs">{status}</span></div><div className="mt-3 text-4xl font-black text-slate-900">{safeValue}<span className="text-sm text-slate-400">/100</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#025EB8]" style={{ width: `${safeValue}%` }} /></div></CardContent></Card>;
}

function NavButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <Link href={href} className={`block rounded-md border px-3 py-2 text-sm font-medium transition ${primary ? "border-[#025EB8] bg-[#025EB8] text-white hover:bg-[#024a91]" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"}`}>{children}</Link>;
}

function resultLabel(result?: RetryResult["result"]) {
  if (!result) return "لا توجد نتيجة";
  if (result.ok) return "تم الإرسال";
  if (result.skipped) return `تم التخطي: ${result.reason ?? "غير محدد"}`;
  return `فشل: ${result.error ?? result.reason ?? "غير محدد"}`;
}

function qualityLabel(q?: AttributionSignals["quality"]) {
  if (q === "strong") return "قوي";
  if (q === "medium") return "متوسط";
  if (q === "weak") return "ضعيف";
  return "—";
}

function boolMark(v?: boolean) { return v ? "✓" : "—"; }
function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"; }
function ratio(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—"; }

export default function MarketingIntelligencePage() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [reconciliation, setReconciliation] = React.useState<Reconciliation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [retrying, setRetrying] = React.useState(false);
  const [lastRetry, setLastRetry] = React.useState<RetrySummary | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, reconciliationRes] = await Promise.all([
        fetch("/api/admin/marketing-intelligence/health", { cache: "no-store" }),
        fetch("/api/admin/marketing-intelligence/reconciliation?platform=META&days=7", { cache: "no-store" }),
      ]);
      if (!healthRes.ok) throw new Error("health");
      setHealth((await healthRes.json()) as Health);
      if (reconciliationRes.ok) setReconciliation((await reconciliationRes.json()) as Reconciliation);
      else setReconciliation(null);
    } catch {
      toast.error("تعذر تحميل مركز ذكاء التسويق");
      setHealth(null);
      setReconciliation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function retryMissing() {
    setRetrying(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/retry-missing-conversions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 25, days: 7 }) });
      const data = (await res.json().catch(() => ({}))) as RetrySummary;
      if (!res.ok || data.ok === false) throw new Error("retry");
      setLastRetry(data);
      toast.success(`تمت مراجعة ${data.scanned ?? 0} تبرع`);
      await load();
    } catch {
      toast.error("فشل تشغيل مراجعة التحويلات المفقودة");
    } finally {
      setRetrying(false);
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#025EB8]" /></div>;
  if (!health) return <div className="p-6" dir="rtl"><Card><CardHeader><CardTitle>تعذر تحميل ذكاء التسويق</CardTitle><CardDescription>راجع الصلاحيات أو اتصال قاعدة البيانات.</CardDescription></CardHeader><CardContent><Button onClick={load}>إعادة المحاولة</Button></CardContent></Card></div>;

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-2xl bg-[#025EB8]/10 p-3 text-[#025EB8]"><Activity className="h-6 w-6" /></span><div><h1 className="text-xl font-black text-slate-950">ذكاء التسويق</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">مركز موحد للتتبع، البكسلات، الإعلانات، التحويلات، وجودة روابط الحملات.</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button><Button onClick={retryMissing} disabled={retrying} className="gap-2 bg-[#025EB8] hover:bg-[#024a91]">{retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}مراجعة التحويلات المفقودة</Button></div></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><ScoreCard label="صحة المنظومة" value={health.scores.overall} /><ScoreCard label="جاهزية المنصات" value={health.scores.readiness} /><ScoreCard label="تسليم التحويلات" value={health.scores.delivery} /></div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4"><Card><CardContent className="p-4"><div className="text-xs text-slate-500">تبرعات مدفوعة / 7 أيام</div><div className="mt-1 text-2xl font-black">{health.donations.paidLast7d}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-slate-500">صفوف checkout / 7 أيام</div><div className="mt-1 text-2xl font-black">{health.donations.checkoutRowsLast7d}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-slate-500">تحويلات ناقصة</div><div className="mt-1 text-2xl font-black text-rose-700">{health.donations.missingServerConversions}</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-slate-500">ConversionEvent مرسلة</div><div className="mt-1 text-2xl font-black text-emerald-700">{health.conversionEvents.sentLast7d}</div></CardContent></Card></div>

    {reconciliation ? <Card className="border-blue-100"><CardHeader><CardTitle>مقارنة الموقع مع Meta</CardTitle><CardDescription>مقارنة أولية بين التبرعات الفعلية في الموقع وبيانات المنصة للفترة {reconciliation.range.from} — {reconciliation.range.to}.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-4"><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">إيراد الموقع</div><div className="mt-1 text-2xl font-black">{money(reconciliation.summary.siteRevenue)}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">صرف المنصة</div><div className="mt-1 text-2xl font-black">{money(reconciliation.summary.platformSpend)}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">ROAS الحقيقي</div><div className="mt-1 text-2xl font-black">{ratio(reconciliation.summary.actualRoas)}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">ROAS المنصة</div><div className="mt-1 text-2xl font-black">{ratio(reconciliation.summary.platformRoas)}</div></div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><div className="rounded-xl border p-3 text-sm">إسناد قوي: <b>{reconciliation.summary.attribution.strong}</b></div><div className="rounded-xl border p-3 text-sm">إسناد متوسط: <b>{reconciliation.summary.attribution.medium}</b></div><div className="rounded-xl border p-3 text-sm">إسناد ضعيف: <b>{reconciliation.summary.attribution.weak}</b> · اختلاف دول: <b>{reconciliation.summary.countryMismatchCount}</b></div></div>{reconciliation.recommendations.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-bold">توصيات سريعة</div><ul className="mt-2 list-inside list-disc space-y-1">{reconciliation.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}</ul></div> : null}<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="py-2 text-right">الحملة/الإعلان</th><th className="py-2 text-right">تبرعات الموقع</th><th className="py-2 text-right">إيراد الموقع</th><th className="py-2 text-right">صرف المنصة</th><th className="py-2 text-right">تحويلات المنصة</th><th className="py-2 text-right">ROAS حقيقي</th><th className="py-2 text-right">فرق التحويل</th></tr></thead><tbody>{reconciliation.rows.length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-slate-500">لا توجد بيانات مقارنة بعد.</td></tr> : reconciliation.rows.slice(0, 8).map((row) => <tr key={row.key} className="border-b last:border-0"><td className="py-2 font-semibold">{row.label}</td><td className="py-2">{row.siteDonations}</td><td className="py-2">{money(row.siteRevenue)}</td><td className="py-2">{money(row.platformSpend)}</td><td className="py-2">{row.platformReportedConversions}</td><td className="py-2">{ratio(row.actualRoas)}</td><td className="py-2">{row.conversionGap}</td></tr>)}</tbody></table></div></CardContent></Card> : null}

    {lastRetry ? <Card className="border-blue-200 bg-blue-50/40"><CardHeader><CardTitle>نتيجة آخر مراجعة للتحويلات</CardTitle><CardDescription>تم فحص {lastRetry.considered ?? 0} تبرع، وتمت محاولة معالجة {lastRetry.scanned ?? 0} تبرع. جودة الإسناد توضح هل التحويل قابل للنسبة للإعلان أم CAPI ناجح فقط.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="py-2 text-right">التبرع</th><th className="py-2 text-right">المبلغ</th><th className="py-2 text-right">النتيجة</th><th className="py-2 text-right">جودة الإسناد</th><th className="py-2 text-right">fbclid</th><th className="py-2 text-right">fbc</th><th className="py-2 text-right">fbp</th><th className="py-2 text-right">UTM</th><th className="py-2 text-right">Campaign</th><th className="py-2 text-right">Ad</th><th className="py-2 text-right">Adset</th><th className="py-2 text-right">fbtrace</th><th className="py-2 text-right">تحذيرات</th></tr></thead><tbody>{(lastRetry.results ?? []).length === 0 ? <tr><td colSpan={13} className="py-6 text-center text-slate-500">لا توجد تبرعات احتاجت إعادة معالجة.</td></tr> : (lastRetry.results ?? []).map((row) => <tr key={row.donationId} className="border-b last:border-0"><td className="py-2 font-mono text-xs">{row.donationId}</td><td className="py-2">{row.amount} {row.currency}</td><td className="py-2">{resultLabel(row.result)}</td><td className="py-2">{qualityLabel(row.attribution?.quality)}</td><td className="py-2">{boolMark(row.attribution?.fbclid)}</td><td className="py-2">{boolMark(row.attribution?.fbc)}</td><td className="py-2">{boolMark(row.attribution?.fbp)}</td><td className="py-2">{boolMark(row.attribution?.utm)}</td><td className="py-2">{boolMark(row.attribution?.campaign)}</td><td className="py-2">{boolMark(row.attribution?.ad)}</td><td className="py-2">{boolMark(row.attribution?.adset)}</td><td className="py-2 font-mono text-xs">{row.result?.fbtrace_id ?? "—"}</td><td className="max-w-[18rem] truncate py-2 text-xs text-amber-700">{row.attribution?.warnings?.join(", ") || "—"}</td></tr>)}</tbody></table></div></CardContent></Card> : null}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>حالة المنصات</CardTitle><CardDescription>الجاهزية تقيس وجود الإعدادات المطلوبة للتسجيل والتحويلات.</CardDescription></CardHeader><CardContent className="space-y-3">{health.platforms.map((p) => <div key={p.platform} className="flex items-center justify-between rounded-xl border p-3"><div><div className="font-semibold text-slate-900">{p.label}</div><div className="mt-1 text-xs text-slate-500">{p.ready ? "جاهز" : `ناقص: ${p.missing.join(", ")}`}</div></div>{p.ready ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}</div>)}</CardContent></Card><Card><CardHeader><CardTitle>Campaign Builder</CardTitle><CardDescription>منشئ الروابط هو نقطة دخول الحملات التسويقية.</CardDescription></CardHeader><CardContent className="space-y-2"><NavButton href={health.links.campaignBuilder} primary>فتح منشئ الحملات والروابط</NavButton><NavButton href={health.links.ads}>إدارة الإعلانات</NavButton><NavButton href={health.links.pixels}>البكسلات والتتبع</NavButton><NavButton href={health.links.connections}>ربط المنصات</NavButton></CardContent></Card></div>
    <Card><CardHeader><CardTitle>آخر أحداث التحويل</CardTitle><CardDescription>سجل موحد يوضح كل منصة والقناة والحالة.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="py-2 text-right">المنصة</th><th className="py-2 text-right">الحدث</th><th className="py-2 text-right">القناة</th><th className="py-2 text-right">الحالة</th><th className="py-2 text-right">المبلغ</th><th className="py-2 text-right">محاولات</th><th className="py-2 text-right">خطأ</th></tr></thead><tbody>{health.conversionEvents.recent.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-500">لا توجد أحداث تحويل مسجلة بعد.</td></tr> : health.conversionEvents.recent.map((event, idx) => <tr key={event._id?.$oid ?? event.id ?? idx} className="border-b last:border-0"><td className="py-3 font-semibold">{event.platform ?? "—"}</td><td className="py-3">{event.eventName ?? "—"}</td><td className="py-3">{event.channel ?? "—"}</td><td className="py-3">{event.status ?? "—"}</td><td className="py-3">{typeof event.value === "number" ? `${event.value} ${event.currency ?? ""}` : "—"}</td><td className="py-3">{event.attempts ?? 1}</td><td className="max-w-[20rem] truncate py-3 text-xs text-rose-700">{event.error ?? "—"}</td></tr>)}</tbody></table></div></CardContent></Card>
  </div>;
}
