"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Delivery = {
  id: string;
  channel: string;
  provider: string | null;
  status: string;
  origin: string;
  locale: string | null;
  campaignId: string | null;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  templateName: string | null;
  renderedSubject: string | null;
  renderedBody: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

const statusClass: Record<string, string> = {
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RENDERED: "border-blue-200 bg-blue-50 text-blue-700",
  SKIPPED: "border-amber-200 bg-amber-50 text-amber-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
};

const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل قصيرة" };
const statusLabel: Record<string, string> = {
  RENDERED: "تجهيز",
  SKIPPED: "لم تُرسل",
  SENT: "أُرسلت",
  SENT_TO_PROVIDER: "أُرسلت",
  DELIVERED: "وصلت",
  READ: "تمت القراءة",
  OPENED: "فُتحت",
  CLICKED: "نقر",
  REPLIED: "رد المتبرع",
  FAILED: "فشلت",
  BOUNCED: "مرتدة",
};

export default function DeliveryLogsPage() {
  const [items, setItems] = React.useState<Delivery[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [channel, setChannel] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (channel) qs.set("channel", channel);
      if (status) qs.set("status", status);
      const res = await fetch(`/api/dashboard/operations/communication/delivery-logs?${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setItems(json?.deliveries ?? []);
    } finally {
      setLoading(false);
    }
  }, [channel, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#025EB8]">مركز التواصل</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">سجل الإرسال</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">أرشيف كل رسالة مُجهّزة أو متخطّاة: القناة، الحالة، المستلم، ومعرّف المزود إن وُجد.</p>
          </div>
          <Button asChild variant="outline" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">القناة</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">الكل</option><option value="WHATSAPP">واتساب</option><option value="EMAIL">إيميل</option><option value="SMS">رسائل قصيرة</option></select></label>
          <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">الحالة</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">الكل</option><option value="RENDERED">تجهيز</option><option value="SKIPPED">متخطّى</option><option value="SENT">أُرسل</option><option value="DELIVERED">وصل</option><option value="FAILED">فشل</option></select></label>
          <Button variant="outline" className="gap-2" onClick={() => load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد سجلات إرسال بعد. ستظهر عند تجهيز حملات أو رسائل.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
                  <th className="p-3 text-right">القناة</th><th className="p-3 text-right">المستلم</th><th className="p-3 text-right">اللغة</th><th className="p-3 text-center">الحالة</th><th className="p-3 text-right">رقم تتبع المزود</th><th className="p-3 text-right">السبب</th><th className="p-3"></th>
                </tr></thead>
                <tbody>
                  {items.map((d) => (
                    <React.Fragment key={d.id}>
                      <tr className="border-b last:border-0">
                        <td className="p-3">{channelLabel[d.channel] ?? d.channel}</td>
                        <td className="p-3">{d.recipientEmail || d.recipientPhone || (d.recipientUserId ? "متبرع" : "—")}</td>
                        <td className="p-3">{d.locale ?? "—"}</td>
                        <td className="p-3 text-center"><Badge variant="outline" className={statusClass[d.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{statusLabel[d.status] ?? d.status}</Badge></td>
                        <td className="p-3 font-mono text-xs">{d.providerMessageId ?? "—"}</td>
                        <td className="p-3 text-xs text-rose-600">{d.errorMessage ?? "—"}</td>
                        <td className="p-3 text-left"><button className="text-xs text-[#025EB8] underline" onClick={() => setOpen(open === d.id ? null : d.id)}>{open === d.id ? "إخفاء" : "المحتوى"}</button></td>
                      </tr>
                      {open === d.id ? (
                        <tr className="bg-slate-50"><td colSpan={7} className="p-3">
                          <div className="rounded-lg border bg-white p-3 text-sm">
                            <p className="text-xs text-slate-400">{d.templateName ? `القالب: ${d.templateName} · ` : ""}{d.campaignId ? <Link href={`/dashboard/operations/communication/campaigns/${d.campaignId}`} className="text-[#025EB8] underline">الحملة</Link> : "بدون حملة"}</p>
                            {d.renderedSubject ? <p className="mt-1 font-bold">{d.renderedSubject}</p> : null}
                            <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{d.renderedBody ?? "—"}</p>
                          </div>
                        </td></tr>
                      ) : null}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
