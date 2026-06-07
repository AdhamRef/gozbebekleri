"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, GitCompareArrows, ListChecks, Loader2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformHealth = { platform: string; label: string; ready: boolean; missing: string[] };
type RecentEvent = { platform?: string; channel?: string; eventName?: string; status?: string; donationId?: string; eventId?: string; error?: string; updatedAt?: string; createdAt?: string };
type Health = {
  generatedAt: string;
  scores: { readiness: number; delivery: number; overall: number };
  platforms: PlatformHealth[];
  donations: { checkoutRowsLast7d: number; paidLast7d: number; failedLast7d: number; missingServerConversions: number };
  conversionEvents: { sentLast7d: number; failedLast7d: number; skippedLast7d: number; recent: RecentEvent[] };
};

const tools = [
  { title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center", icon: Wrench, desc: "إعادة فحص وإرسال التحويلات الناقصة أو الفاشلة." },
  { title: "سجل أحداث التحويل", href: "/dashboard/conversion-events", icon: ListChecks, desc: "عرض كل أحداث Meta / GA4 / Google / TikTok وحالتها." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", icon: GitCompareArrows, desc: "مقارنة تبرعات الموقع مع أرقام المنصات الإعلانية." },
  { title: "إعدادات البكسلات", href: "/dashboard/pixels", icon: ShieldCheck, desc: "إعداد Pixel IDs وCAPI وGA4 وGoogle Ads وTikTok." },
];

function scoreClass(value: number) {
  if (value >= 80) return "text-emerald-700";
  if (value >= 50) return "text-amber-700";
  return "text-rose-700";
}
function statusClass(status?: string) {
  if (status === "SENT") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "SKIPPED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}
function statusLabel(status?: string) {
  if (status === "SENT") return "تم";
  if (status === "FAILED") return "فشل";
  if (status === "SKIPPED") return "تم التخطي";
  return status || "غير معروف";
}

export default function MarketingQualityPage() {
  const [data, setData] = React.useState<Health | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/health", { cache: "no-store" });
      const json = await res.json().catch(() => null) as Health | null;
      if (!res.ok || !json?.scores) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل حالة جودة التتبع");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/75">Marketing Operating System</p>
          <h1 className="mt-2 text-3xl font-black">جودة التتبع والإصلاح</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">منطقة الصيانة والتشخيص: إصلاح التبرعات، فحص أحداث التحويل، مقارنة الموقع بالمنصات، ومراجعة إعدادات البكسلات.</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[18rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">لا توجد بيانات جودة متاحة.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Kpi label="الصحة العامة" value={`${data.scores.overall}%`} className={scoreClass(data.scores.overall)} />
        <Kpi label="جاهزية المنصات" value={`${data.scores.readiness}%`} className={scoreClass(data.scores.readiness)} />
        <Kpi label="تسليم التحويلات" value={`${data.scores.delivery}%`} className={scoreClass(data.scores.delivery)} />
        <Kpi label="تبرعات مدفوعة" value={String(data.donations.paidLast7d)} />
        <Kpi label="تحويلات ناقصة" value={String(data.donations.missingServerConversions)} className={data.donations.missingServerConversions > 0 ? "text-rose-700" : "text-emerald-700"} />
        <Kpi label="أحداث فاشلة" value={String(data.conversionEvents.failedLast7d)} className={data.conversionEvents.failedLast7d > 0 ? "text-rose-700" : "text-emerald-700"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#025EB8]" />جاهزية المنصات</CardTitle><CardDescription>ما المنصات الجاهزة وما الحقول الناقصة؟</CardDescription></CardHeader>
          <CardContent className="space-y-2">{data.platforms.map((platform) => <div key={platform.platform} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{platform.label}</b>{platform.ready ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" />جاهز</span> : <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" />ناقص</span>}</div>{platform.missing.length ? <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">ناقص: {platform.missing.join(", ")}</div> : null}</div>)}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-[#025EB8]" />آخر أحداث التحويل</CardTitle><CardDescription>آخر عمليات إرسال أو فشل أو تخطي للتحويلات.</CardDescription></CardHeader>
          <CardContent className="space-y-2">{data.conversionEvents.recent.length === 0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد أحداث تحويل حديثة.</div> : data.conversionEvents.recent.slice(0, 8).map((event, index) => <div key={`${event.eventId}-${index}`} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{event.platform || "منصة"} • {event.channel || "قناة"}</b><span className={`rounded-full border px-2 py-1 text-xs ${statusClass(event.status)}`}>{statusLabel(event.status)}</span></div><div className="mt-1 text-xs text-slate-500">{event.eventName || "حدث"} • {event.donationId || event.eventId || "بدون معرف"}</div>{event.error ? <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{event.error}</div> : null}</div>)}</CardContent>
        </Card>
      </div>
    </>}

    <div className="grid gap-4 lg:grid-cols-2">
      {tools.map((tool) => { const Icon = tool.icon; return <Link key={tool.href} href={tool.href}><Card className="h-full transition hover:border-blue-200 hover:shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#025EB8]" />{tool.title}</CardTitle><CardDescription>{tool.desc}</CardDescription></CardHeader><CardContent><div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">افتح الأداة فقط عند الحاجة للتشخيص أو الإصلاح.</div></CardContent></Card></Link>; })}
    </div>
  </div>;
}

function Kpi({ label, value, className }: { label: string; value: string; className?: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className={`mt-2 text-2xl font-black ${className || "text-slate-950"}`}>{value}</div></CardContent></Card>; }
