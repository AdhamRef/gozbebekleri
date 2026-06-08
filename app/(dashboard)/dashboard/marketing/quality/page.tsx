"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformHealth = { platform: string; label: string; ready: boolean; missing: string[] };
type RecentEvent = { platform?: string; channel?: string; eventName?: string; status?: string; error?: string };
type Health = {
  scores: { readiness: number; delivery: number; overall: number };
  platforms: PlatformHealth[];
  donations: { paidLast7d: number; missingServerConversions: number };
  conversionEvents: { failedLast7d: number; recent: RecentEvent[] };
};

const tools = [
  { title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center", desc: "إعادة فحص وإرسال التحويلات الناقصة." },
  { title: "سجل أحداث التحويل", href: "/dashboard/conversion-events", desc: "عرض أحداث Meta / GA4 / Google / TikTok." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", desc: "مقارنة التبرعات مع أرقام المنصات." },
  { title: "إعدادات البكسلات", href: "/dashboard/pixels", desc: "إعداد Pixel وCAPI وGA4 وGoogle Ads." },
];

function scoreClass(value: number) {
  if (value >= 80) return "text-emerald-700";
  if (value >= 50) return "text-amber-700";
  return "text-rose-700";
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
      toast.error("تعذر تحميل جودة التتبع");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const missingPlatforms = data?.platforms.filter((platform) => !platform.ready) ?? [];
  const failedEvents = data?.conversionEvents.recent.filter((event) => event.status === "FAILED").slice(0, 5) ?? [];

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/75">Marketing Operating System</p>
          <h1 className="mt-2 text-3xl font-black">جودة التتبع والإصلاح</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">صفحة مختصرة لمعرفة هل التتبع سليم أم يحتاج إصلاح.</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[18rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">لا توجد بيانات جودة.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="الصحة العامة" value={`${data.scores.overall}%`} className={scoreClass(data.scores.overall)} />
        <Kpi label="جاهزية المنصات" value={`${data.scores.readiness}%`} className={scoreClass(data.scores.readiness)} />
        <Kpi label="تسليم التحويلات" value={`${data.scores.delivery}%`} className={scoreClass(data.scores.delivery)} />
        <Kpi label="تحويلات ناقصة" value={String(data.donations.missingServerConversions)} className={data.donations.missingServerConversions > 0 ? "text-rose-700" : "text-emerald-700"} />
        <Kpi label="أحداث فاشلة" value={String(data.conversionEvents.failedLast7d)} className={data.conversionEvents.failedLast7d > 0 ? "text-rose-700" : "text-emerald-700"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#025EB8]" />المنصات التي تحتاج مراجعة</CardTitle><CardDescription>اعرض الناقص فقط، وليس كل التفاصيل.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {missingPlatforms.length === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">كل المنصات الأساسية جاهزة.</div> : missingPlatforms.map((platform) => <div key={platform.platform} className="rounded-xl border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><b>{platform.label}</b><span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" />ناقص</span></div>
              <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{platform.missing.join(", ")}</div>
            </div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[#025EB8]" />ما يحتاج إصلاح؟</CardTitle><CardDescription>مختصر المشاكل الحالية.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {data.donations.missingServerConversions > 0 ? <Problem title="تحويلات ناقصة" body={`${data.donations.missingServerConversions} تبرع يحتاج فحص أو إعادة إرسال.`} /> : null}
            {data.conversionEvents.failedLast7d > 0 ? <Problem title="أحداث فاشلة" body={`${data.conversionEvents.failedLast7d} حدث فشل في آخر 7 أيام.`} /> : null}
            {failedEvents.length ? <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer list-none text-sm font-bold text-slate-900">عرض آخر الأخطاء</summary><div className="mt-3 space-y-2">{failedEvents.map((event, index) => <div key={index} className="rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{event.platform || "منصة"} • {event.eventName || "حدث"}{event.error ? ` — ${event.error}` : ""}</div>)}</div></details> : null}
            {data.donations.missingServerConversions === 0 && data.conversionEvents.failedLast7d === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">لا توجد مشاكل حرجة ظاهرة الآن.</div> : null}
          </CardContent>
        </Card>
      </div>
    </>}

    <Card>
      <CardHeader><CardTitle>أدوات الإصلاح</CardTitle><CardDescription>افتحها فقط عند الحاجة.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => <Link key={tool.href} href={tool.href} className="rounded-xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"><div className="font-bold text-slate-900">{tool.title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{tool.desc}</p></Link>)}
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link href="/dashboard/marketing" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">نظام التسويق</Link><Link href="/dashboard/marketing/data-sync" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">سحب البيانات</Link><Link href="/dashboard/marketing/insights" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">التحليل والتوصيات</Link></CardContent></Card>
  </div>;
}

function Kpi({ label, value, className }: { label: string; value: string; className?: string }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className={`mt-2 text-2xl font-black ${className || "text-slate-950"}`}>{value}</div></CardContent></Card>;
}

function Problem({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800"><div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />{title}</div><p className="mt-1 text-sm leading-6">{body}</p></div>;
}
