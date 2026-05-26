"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformHealth = { platform: string; label: string; ready: boolean; missing: string[] };
type RecentEvent = { _id?: { $oid?: string }; id?: string; platform?: string; eventName?: string; channel?: string; status?: string; attempts?: number; error?: string | null };
type Health = {
  scores: { readiness: number; delivery: number; overall: number };
  platforms: PlatformHealth[];
  donations: { checkoutRowsLast7d: number; paidLast7d: number; failedLast7d: number; missingServerConversions: number };
  conversionEvents: { sentLast7d: number; failedLast7d: number; skippedLast7d: number; recent: RecentEvent[] };
  links: { campaignBuilder: string; ads: string; pixels: string; connections: string };
};

function ScoreCard({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const status = safeValue >= 85 ? "ممتاز" : safeValue >= 60 ? "يحتاج متابعة" : "خطر";
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className="rounded-full border px-2 py-1 text-xs">{status}</span></div><div className="mt-3 text-4xl font-black text-slate-900">{safeValue}<span className="text-sm text-slate-400">/100</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#025EB8]" style={{ width: `${safeValue}%` }} /></div></CardContent></Card>;
}

function NavButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <Link href={href} className={`block rounded-md border px-3 py-2 text-sm font-medium transition ${primary ? "border-[#025EB8] bg-[#025EB8] text-white hover:bg-[#024a91]" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"}`}>{children}</Link>;
}

export default function MarketingIntelligencePage() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [retrying, setRetrying] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/health", { cache: "no-store" });
      if (!res.ok) throw new Error("health");
      setHealth((await res.json()) as Health);
    } catch {
      toast.error("تعذر تحميل مركز ذكاء التسويق");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function retryMissing() {
    setRetrying(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/retry-missing-conversions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 25, days: 7 }) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; scanned?: number };
      if (!res.ok || data.ok === false) throw new Error("retry");
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>حالة المنصات</CardTitle><CardDescription>الجاهزية تقيس وجود الإعدادات المطلوبة للتسجيل والتحويلات.</CardDescription></CardHeader><CardContent className="space-y-3">{health.platforms.map((p) => <div key={p.platform} className="flex items-center justify-between rounded-xl border p-3"><div><div className="font-semibold text-slate-900">{p.label}</div><div className="mt-1 text-xs text-slate-500">{p.ready ? "جاهز" : `ناقص: ${p.missing.join(", ")}`}</div></div>{p.ready ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}</div>)}</CardContent></Card><Card><CardHeader><CardTitle>Campaign Builder</CardTitle><CardDescription>منشئ الروابط هو نقطة دخول الحملات التسويقية.</CardDescription></CardHeader><CardContent className="space-y-2"><NavButton href={health.links.campaignBuilder} primary>فتح منشئ الحملات والروابط</NavButton><NavButton href={health.links.ads}>إدارة الإعلانات</NavButton><NavButton href={health.links.pixels}>البكسلات والتتبع</NavButton><NavButton href={health.links.connections}>ربط المنصات</NavButton></CardContent></Card></div>
    <Card><CardHeader><CardTitle>آخر أحداث التحويل</CardTitle><CardDescription>سجل موحد يوضح كل منصة والقناة والحالة.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="py-2 text-right">المنصة</th><th className="py-2 text-right">الحدث</th><th className="py-2 text-right">القناة</th><th className="py-2 text-right">الحالة</th><th className="py-2 text-right">محاولات</th><th className="py-2 text-right">خطأ</th></tr></thead><tbody>{health.conversionEvents.recent.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-slate-500">لا توجد أحداث تحويل مسجلة بعد.</td></tr> : health.conversionEvents.recent.map((event, idx) => <tr key={event._id?.$oid ?? event.id ?? idx} className="border-b last:border-0"><td className="py-3 font-semibold">{event.platform ?? "—"}</td><td className="py-3">{event.eventName ?? "—"}</td><td className="py-3">{event.channel ?? "—"}</td><td className="py-3">{event.status ?? "—"}</td><td className="py-3">{event.attempts ?? 1}</td><td className="max-w-[20rem] truncate py-3 text-xs text-rose-700">{event.error ?? "—"}</td></tr>)}</tbody></table></div></CardContent></Card>
  </div>;
}
