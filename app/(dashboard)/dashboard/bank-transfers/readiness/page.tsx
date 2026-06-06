"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Check = {
  id: string;
  title: string;
  status: "PASS" | "WARN" | "FAIL";
  description: string;
  action: string;
  href: string;
  value?: number | string;
};

type ReadinessResponse = {
  ok: boolean;
  generatedAt: string;
  score: number;
  summary: {
    banks: number;
    activeBanks: number;
    uploads: number;
    transactions: number;
    pending: number;
    pendingOld: number;
    approved: number;
    ignored: number;
    deleted: number;
    approvedWithoutDonation: number;
    totals: Record<string, { total: number; count: number }>;
  };
  checks: Check[];
  recentPending: Array<{ id?: string; donorName?: string; amount?: number; currency?: string; transactionDate?: string; bankId?: string; finalProject?: string }>;
};

function statusClass(status: Check["status"]) {
  if (status === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "FAIL") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}
function statusIcon(status: Check["status"]) {
  if (status === "PASS") return <CheckCircle2 className="h-5 w-5" />;
  if (status === "FAIL") return <XCircle className="h-5 w-5" />;
  return <AlertTriangle className="h-5 w-5" />;
}
function statusLabel(status: Check["status"]) {
  if (status === "PASS") return "جاهز";
  if (status === "FAIL") return "خلل";
  return "يحتاج انتباه";
}
function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 55) return "text-amber-700";
  return "text-rose-700";
}
function money(value?: number, currency?: string) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || ""}`;
}

export default function BankTransfersReadinessPage() {
  const [data, setData] = React.useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bank-transfers/readiness", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ReadinessResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل فحص التحويلات البنكية");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/bank-transfers" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى التحويلات البنكية</Link>
        <h1 className="text-2xl font-black text-slate-950">فحص جاهزية التحويلات البنكية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">شاشة تشغيلية للتأكد من حالة البنوك والكشوف والعمليات قيد المراجعة والعمليات المعتمدة غير المربوطة بتبرع رسمي.</p>
      </div>
      <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث الفحص</Button>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" />درجة الجاهزية</div>
            <div className={`mt-2 text-5xl font-black ${scoreTone(data.score)}`}>{data.score}/100</div>
            <div className="mt-2 text-xs text-slate-500">آخر فحص: {new Date(data.generatedAt).toLocaleString()}</div>
          </div>
          <Kpi label="قيد المراجعة" value={String(data.summary.pending)} />
          <Kpi label="معتمد" value={String(data.summary.approved)} />
          <Kpi label="كشوف" value={String(data.summary.uploads)} />
          <Kpi label="غير مربوطة بتبرع" value={String(data.summary.approvedWithoutDonation)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>نتائج الفحص</CardTitle>
            <CardDescription>كل بند يوضح الحالة والإجراء المطلوب.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.checks.map((check) => <div key={check.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${statusClass(check.status)}`}>{statusIcon(check.status)}{statusLabel(check.status)}</span>
                  <h2 className="mt-2 text-base font-bold text-slate-950">{check.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{check.description}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><b>المطلوب:</b> {check.action}</div>
                </div>
                <Link href={check.href} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح <ArrowLeft className="h-4 w-4" /></Link>
              </div>
            </div>)}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>الإجماليات المعتمدة</CardTitle><CardDescription>حسب العملة من العمليات المعتمدة فقط.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.keys(data.summary.totals).length ? Object.entries(data.summary.totals).map(([currency, item]) => <div key={currency} className="rounded-xl border bg-slate-50 p-3"><div className="font-bold">{money(item.total, currency)}</div><div className="mt-1 text-xs text-slate-500">عدد العمليات: {item.count}</div></div>) : <div className="rounded-xl bg-slate-50 p-4 text-center text-slate-500">لا توجد إجماليات معتمدة.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>آخر عمليات تحتاج مراجعة</CardTitle><CardDescription>اختصار لأحدث العمليات الواردة غير المعتمدة.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.recentPending.length ? data.recentPending.map((row) => <Link key={row.id || `${row.donorName}-${row.amount}`} href="/dashboard/bank-transfers?status=PENDING_REVIEW" className="block rounded-xl border p-3 hover:bg-slate-50"><div className="font-medium text-slate-900">{row.donorName || "بدون اسم"}</div><div className="mt-1 text-xs text-slate-500">{money(row.amount, row.currency)} • {row.finalProject || "تبرع عام"}</div></Link>) : <div className="rounded-xl bg-slate-50 p-4 text-center text-slate-500">لا توجد عمليات قيد المراجعة.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-slate-950">{value}</div></div>;
}
