"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, MessageCircle, AlertTriangle, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Donor = { userId: string | null; email: string | null; locale: string | null; country: string | null; totalDonations: number | null; lastDonationAt: string | null; whatsappOptIn: boolean; doNotContact: boolean };
type Conversation = { phone: string; donor: Donor | null; unresolved: boolean; lastMessageAt: string | null; lastInboundText: string | null; needsReply: boolean; inboundCount: number; outboundCount: number };
type TimelineItem = { kind: string; at: string | null; text: string | null; status: string | null };
type Detail = { phone: string; donor: Donor | null; unresolved: boolean; timeline: TimelineItem[] };

type Filter = "all" | "needsReply" | "unresolved";

export default function InboxPage() {
  const [items, setItems] = React.useState<Conversation[]>([]);
  const [providerConfigured, setProviderConfigured] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [locale, setLocale] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/inbox", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setItems(json?.conversations ?? []);
      setProviderConfigured(json?.providerConfigured ?? false);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openConversation = React.useCallback(async (phone: string) => {
    setSelected(phone);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/dashboard/operations/communication/inbox?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setDetail(json?.conversation ?? null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filtered = items.filter((c) => {
    if (filter === "needsReply" && !c.needsReply) return false;
    if (filter === "unresolved" && !c.unresolved) return false;
    if (locale && c.donor?.locale !== locale) return false;
    return true;
  });

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل</p>
            <h1 className="mt-1.5 text-2xl font-black">صندوق واتساب</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">محادثات واتساب الواردة والصادرة، مربوطة بالمتبرع حسب رقم الهاتف عند التطابق.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="gap-2" onClick={() => load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث</Button>
            <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations/communication">العودة <ArrowLeft className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      {!providerConfigured ? (
        <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">مزود واتساب غير مُعدّ بعد. عند إكمال الإعداد واستقبال الأحداث، ستظهر المحادثات هنا. لا يمكن الرد من هنا حتى تفعيل الإرسال.</CardContent></Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
          {(["all", "needsReply", "unresolved"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md border px-3 py-1.5 ${filter === f ? "border-[#025EB8] bg-blue-50 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}>
              {f === "all" ? "الكل" : f === "needsReply" ? "بحاجة لرد" : "غير محدد المتبرع"}
            </button>
          ))}
          <input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="لغة (مثل ar)" className="ml-auto w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-[10rem] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#025EB8]" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">لا توجد محادثات بعد.</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => (
                  <li key={c.phone}>
                    <button onClick={() => openConversation(c.phone)} className={`flex w-full flex-col items-start gap-1 p-3 text-right hover:bg-slate-50 ${selected === c.phone ? "bg-blue-50/60" : ""}`}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-bold text-slate-800">{c.donor?.email || c.phone}</span>
                        {c.needsReply ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">بحاجة لرد</Badge> : null}
                      </div>
                      <span className="line-clamp-1 text-xs text-slate-500">{c.lastInboundText ?? "—"}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {c.donor?.locale ? <span>{c.donor.locale}</span> : null}
                        {c.unresolved ? <span className="flex items-center gap-0.5 text-amber-600"><UserX className="h-3 w-3" /> غير محدد</span> : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[24rem]">
          <CardContent className="p-4">
            {!selected ? (
              <div className="flex min-h-[20rem] items-center justify-center text-sm text-slate-400"><MessageCircle className="ml-2 h-5 w-5" /> اختر محادثة لعرض التفاصيل</div>
            ) : detailLoading ? (
              <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#025EB8]" /></div>
            ) : !detail ? (
              <div className="p-6 text-center text-sm text-slate-500">تعذّر تحميل المحادثة.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-slate-800">{detail.donor?.email || detail.phone}</span>
                    {detail.unresolved ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700"><AlertTriangle className="ml-1 h-3.5 w-3.5" /> متبرع غير محدد</Badge> : <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">متبرع مطابق</Badge>}
                  </div>
                  {detail.donor ? (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500 md:grid-cols-4">
                      <span>اللغة: {detail.donor.locale ?? "—"}</span>
                      <span>الدولة: {detail.donor.country ?? "—"}</span>
                      <span>التبرعات: {detail.donor.totalDonations ?? 0}</span>
                      <span>واتساب: {detail.donor.whatsappOptIn ? "موافق" : "يحتاج مراجعة"}</span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {detail.timeline.length === 0 ? (
                    <p className="text-center text-sm text-slate-400">لا توجد رسائل في هذه المحادثة.</p>
                  ) : detail.timeline.map((t, i) => (
                    <div key={i} className={`max-w-[80%] rounded-2xl border p-2 text-sm ${t.kind === "inbound" ? "mr-auto bg-white" : t.kind === "outbound" ? "ml-auto bg-blue-50 border-blue-100" : "mx-auto bg-slate-50 text-xs text-slate-500"}`}>
                      {t.kind === "status" ? <span>حالة: {t.status}</span> : <span className="whitespace-pre-wrap leading-6 text-slate-700">{t.text ?? "—"}</span>}
                      {t.at ? <div className="mt-0.5 text-[10px] text-slate-400">{new Date(t.at).toLocaleString("ar")}</div> : null}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  الرد المباشر معطّل حتى تفعيل الإرسال عبر المزود. عند التفعيل، سيتم الرد عبر قالب معتمد وتسجيل الرسالة في الأرشيف.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
