"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BankTransferRow = {
  id: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amount: number;
  currency: string;
  transactionDate: string | null;
  description: string;
  reference: string | null;
  finalProject: string;
  status: string;
  donationId?: string | null;
};

type ApiResponse = { ok: boolean; transactions: BankTransferRow[] };
type CreateResponse = { ok: boolean; donationId: string; alreadyLinked?: boolean; campaignId?: string | null; amountUSD?: number };

function money(value: number, currency: string) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || ""}`;
}

export default function BankTransferOfficialDonationsPage() {
  const [rows, setRows] = React.useState<BankTransferRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<ApiResponse>("/api/admin/bank-transfers/official-donations?limit=200");
      setRows(res.data.transactions ?? []);
    } catch {
      toast.error("تعذر تحميل التحويلات المعتمدة غير المربوطة");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function createDonation(row: BankTransferRow) {
    if (!row.id) return;
    setBusyId(row.id);
    try {
      const res = await axios.post<CreateResponse>("/api/admin/bank-transfers/official-donations", { transactionId: row.id });
      if (res.data.alreadyLinked) toast.success("هذه العملية مربوطة بتبرع رسمي بالفعل");
      else toast.success("تم إنشاء التبرع الرسمي وربطه بالتحويل");
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (error) {
      const message = axios.isAxiosError(error) && typeof error.response?.data?.error === "string" ? error.response.data.error : "فشل إنشاء التبرع الرسمي";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function createAll() {
    const targetRows = rows.filter((row) => row.id);
    if (!targetRows.length) return;
    for (const row of targetRows) {
      // sequential by design to avoid duplicate creation and keep audit clean
      // eslint-disable-next-line no-await-in-loop
      await createDonation(row);
    }
    await load();
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/bank-transfers" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى التحويلات البنكية</Link>
        <h1 className="text-2xl font-black text-slate-950">ربط التحويلات البنكية بتبرعات رسمية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">هذه الصفحة تعرض العمليات البنكية المعتمدة التي لا تملك donationId بعد، وتسمح بإنشاء تبرع رسمي منها بدون تعديل Schema أو كسر نظام الدفع.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        <Button onClick={createAll} disabled={loading || busyId !== null || rows.length === 0} className="gap-2"><WalletCards className="h-4 w-4" />إنشاء الكل</Button>
      </div>
    </div>

    <Card className="border-blue-100 bg-blue-50/40">
      <CardContent className="p-4 text-sm leading-7 text-blue-950">
        <b>ملاحظة تشغيلية:</b> يتم حفظ التبرع الرسمي بمزود دفع <span className="font-mono">BANK_TRANSFER</span> داخل حقل provider، مع استخدام paymentMethod آمن موجود حاليًا حتى لا نعدل enum في Prisma الآن. الربط يتم عبر donationId داخل عملية التحويل البنكي.
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#025EB8]" />عمليات جاهزة للربط</CardTitle>
        <CardDescription>العدد الحالي: {rows.length}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex min-h-[16rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : rows.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد عمليات معتمدة غير مربوطة بتبرع رسمي.</div> : <div className="space-y-3">
          {rows.map((row) => <div key={row.id ?? `${row.reference}-${row.amount}`} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-4xl">
                <h2 className="font-bold text-slate-950">{row.donorName || "متبرع تحويل بنكي"}</h2>
                <div className="mt-1 text-sm text-slate-600">{money(row.amount, row.currency)} • {row.finalProject || "تبرع عام"}</div>
                <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                  <div>التاريخ: {row.transactionDate || "—"}</div>
                  <div>المرجع: {row.reference || "—"}</div>
                  <div>البريد: {row.donorEmail || "سيتم إنشاء بريد داخلي آمن"}</div>
                  <div>الحالة: {row.status}</div>
                </div>
                {row.description ? <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{row.description}</div> : null}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => createDonation(row)} disabled={!row.id || busyId === row.id} className="gap-2">
                  {busyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
                  إنشاء تبرع رسمي
                </Button>
                <Link href={`/dashboard/bank-transfers?status=APPROVED`} className="inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح القائمة <ArrowLeft className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>)}
        </div>}
      </CardContent>
    </Card>
  </div>;
}
