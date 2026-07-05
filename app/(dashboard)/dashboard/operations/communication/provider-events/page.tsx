"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ProviderEvent = {
  id: string;
  provider: string;
  channel: string;
  eventType: string;
  status: string | null;
  providerMessageId: string | null;
  recipient: string | null;
  payloadSanitized: unknown;
  receivedAt: string;
};

export default function ProviderEventsPage() {
  const [items, setItems] = React.useState<ProviderEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [provider, setProvider] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (provider) qs.set("provider", provider);
      const res = await fetch(`/api/dashboard/operations/communication/provider-events?${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setItems(json?.events ?? []);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل</p>
            <h1 className="mt-1.5 text-2xl font-black">أحداث المزودين</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">سجل أحداث المزودين (التسليم، القراءة، الفشل) — تُعرض النسخة الآمنة فقط من البيانات، دون أي أسرار.</p>
          </div>
          <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة لمركز التواصل <ArrowLeft className="h-4 w-4" /></Link></Button>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">المزود</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">الكل</option><option value="META_WHATSAPP">Meta WhatsApp</option><option value="TWILIO">Twilio</option><option value="SENDGRID">SendGrid</option><option value="NETGSM">Netgsm</option></select></label>
          <Button variant="outline" className="gap-2" onClick={() => load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد أحداث مزودين بعد. ستظهر عند تفعيل استقبال أحداث المزودين لاحقًا.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
                  <th className="p-3 text-right">المزود</th><th className="p-3 text-right">القناة</th><th className="p-3 text-right">الحدث</th><th className="p-3 text-center">الحالة</th><th className="p-3 text-right">معرّف الرسالة</th><th className="p-3"></th>
                </tr></thead>
                <tbody>
                  {items.map((e) => (
                    <React.Fragment key={e.id}>
                      <tr className="border-b last:border-0">
                        <td className="p-3">{e.provider}</td>
                        <td className="p-3">{e.channel}</td>
                        <td className="p-3">{e.eventType}</td>
                        <td className="p-3 text-center"><Badge variant="outline">{e.status ?? "—"}</Badge></td>
                        <td className="p-3 font-mono text-xs">{e.providerMessageId ?? "—"}</td>
                        <td className="p-3 text-left"><button className="text-xs text-[#025EB8] underline" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? "إخفاء" : "البيانات"}</button></td>
                      </tr>
                      {open === e.id ? (
                        <tr className="bg-slate-50"><td colSpan={6} className="p-3">
                          <pre className="overflow-x-auto rounded-lg border bg-white p-3 text-xs text-slate-700">{JSON.stringify(e.payloadSanitized ?? {}, null, 2)}</pre>
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
