"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Database, Loader2, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PlatformKey = "all" | "meta" | "google_ads" | "ga4" | "tiktok" | "twilio";
type PeriodKey = "today" | "7" | "14" | "30" | "custom";

type SyncResult = {
  platform?: string;
  status?: string;
  rowsFetched?: number;
  missingRequiredFields?: string[];
  message?: string | null;
  error?: string | null;
};

type SyncResponse = {
  ok?: boolean;
  status?: string;
  results?: SyncResult[];
  error?: string;
};

const periods: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "today", label: "اليوم", days: 1 },
  { key: "7", label: "7 أيام", days: 7 },
  { key: "14", label: "14 يوم", days: 14 },
  { key: "30", label: "30 يوم", days: 30 },
  { key: "custom", label: "Custom", days: null },
];

const platforms: { key: PlatformKey; title: string; details: string }[] = [
  { key: "meta", title: "Meta", details: "الحملات، المجموعات، الإعلانات، الصرف، النقرات، والتحويلات." },
  { key: "google_ads", title: "Google Ads", details: "الحملات، الكلمات، عبارات البحث، العناوين، الأوصاف، الأصول، والصرف." },
  { key: "ga4", title: "GA4", details: "الجلسات، المصادر، الصفحات، الأحداث، الدول، والأجهزة." },
  { key: "tiktok", title: "TikTok", details: "الحملات، المجموعات، الإعلانات، الصرف، النقرات، والتحويلات." },
  { key: "twilio", title: "WhatsApp / Twilio", details: "الرسائل، القوالب، التسليم، الفشل، وروابط التتبع." },
];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFromPeriod(period: PeriodKey, customFrom: string, customTo: string) {
  if (period === "custom") return { dateFrom: customFrom, dateTo: customTo };
  const days = periods.find((item) => item.key === period)?.days ?? 7;
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  return { dateFrom: dateKey(from), dateTo: dateKey(to) };
}

function statusLabel(status?: string) {
  if (status === "success" || status === "SUCCESS") return "ناجح";
  if (status === "partial_success" || status === "PARTIAL_SUCCESS") return "جزئي";
  if (status === "failed" || status === "FAILED") return "فشل";
  if (status === "missing_config" || status === "MISSING_CONFIG") return "إعداد ناقص";
  if (status === "not_implemented" || status === "NOT_IMPLEMENTED") return "غير مفعّل";
  if (status === "skipped" || status === "SKIPPED") return "تم التخطي";
  return status || "غير معروف";
}

function statusClass(status?: string) {
  if (status === "success" || status === "SUCCESS" || status === "partial_success" || status === "PARTIAL_SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function MarketingDataSyncPage() {
  const [period, setPeriod] = React.useState<PeriodKey>("7");
  const [customFrom, setCustomFrom] = React.useState(dateKey(new Date()));
  const [customTo, setCustomTo] = React.useState(dateKey(new Date()));
  const [syncing, setSyncing] = React.useState<PlatformKey | null>(null);
  const [lastResult, setLastResult] = React.useState<SyncResponse | null>(null);
  const range = rangeFromPeriod(period, customFrom, customTo);

  async function runSync(platform: PlatformKey) {
    if (!range.dateFrom || !range.dateTo) return toast.error("اختر تاريخ البداية والنهاية");
    setSyncing(platform);
    try {
      const res = await fetch("/api/admin/marketing/data-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, dateFrom: range.dateFrom, dateTo: range.dateTo }),
      });
      const json = await res.json().catch(() => null) as SyncResponse | null;
      if (!res.ok || !json) throw new Error(json?.error || "sync failed");
      setLastResult(json);
      const label = statusLabel(json.status);
      if (json.ok) toast.success(`تم سحب البيانات: ${label}`);
      else toast(`نتيجة السحب: ${label}`, { icon: "ℹ️" });
    } catch {
      toast.error("تعذر تشغيل سحب البيانات");
    } finally {
      setSyncing(null);
    }
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">سحب البيانات</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">مركز موحد لسحب بيانات الحملات والنتائج من الحسابات الإعلانية، مع فترات: اليوم، 7، 14، 30، أو Custom.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#025EB8]" />الفترة وتشغيل السحب</CardTitle>
        <CardDescription>اختر الفترة ثم شغل مزامنة كل المنصات أو منصة محددة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {periods.map((item) => <Button key={item.key} variant={period === item.key ? "default" : "outline"} onClick={() => setPeriod(item.key)}>{item.label}</Button>)}
        </div>
        {period === "custom" ? <div className="grid gap-3 md:grid-cols-2">
          <div><label className="mb-1 block text-xs text-slate-500">من تاريخ</label><Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></div>
          <div><label className="mb-1 block text-xs text-slate-500">إلى تاريخ</label><Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></div>
        </div> : null}
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">الفترة الحالية: <b>{range.dateFrom}</b> إلى <b>{range.dateTo}</b></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runSync("all")} disabled={syncing !== null} className="gap-2">{syncing === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}مزامنة الكل</Button>
          {platforms.map((platform) => <Button key={platform.key} variant="outline" onClick={() => runSync(platform.key)} disabled={syncing !== null}>{syncing === platform.key ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}{platform.title}</Button>)}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      {platforms.map((platform) => <Card key={platform.key}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-[#025EB8]" />{platform.title}</CardTitle>
          <CardDescription>{platform.details}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">يعرض نتيجة السحب من نفس المنصة عند تشغيلها من الأعلى.</div>
        </CardContent>
      </Card>)}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>نتيجة آخر سحب</CardTitle>
        <CardDescription>تعرض الحالة والصفوف المسحوبة والأخطاء الناقصة لكل منصة.</CardDescription>
      </CardHeader>
      <CardContent>
        {!lastResult ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لم يتم تشغيل سحب بيانات من هذه الصفحة بعد.</div> : <div className="space-y-3">
          <div className={`inline-flex rounded-full border px-3 py-1 text-sm ${statusClass(lastResult.status)}`}>الحالة العامة: {statusLabel(lastResult.status)}</div>
          {(lastResult.results ?? []).map((row, index) => <div key={`${row.platform}-${index}`} className="rounded-xl border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>{row.platform || "منصة"}</b><span className={`rounded-full border px-2 py-1 text-xs ${statusClass(row.status)}`}>{statusLabel(row.status)}</span></div>
            <div className="mt-1 text-xs text-slate-500">الصفوف المسحوبة: {row.rowsFetched ?? 0}</div>
            {row.missingRequiredFields?.length ? <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">حقول ناقصة: {row.missingRequiredFields.join(", ")}</div> : null}
            {row.message ? <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{row.message}</div> : null}
            {row.error ? <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{row.error}</div> : null}
          </div>)}
        </div>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-[#025EB8]" />Google Ads Deep Data</CardTitle>
        <CardDescription>سيكون لجوجل اهتمام خاص بسبب الكلمات وعبارات البحث والعناوين والأوصاف والأصول.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {['Keywords', 'Search Terms', 'Headlines & Descriptions', 'Assets & Final URLs'].map((item) => <div key={item} className="rounded-xl border bg-white p-3 text-sm font-semibold text-slate-800">{item}</div>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والتتبع</Link>
        <Link href="/dashboard/marketing/insights" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">التحليل والتوصيات</Link>
        <Link href="/dashboard/marketing/quality" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">جودة التتبع والإصلاح</Link>
      </CardContent>
    </Card>
  </div>;
}
