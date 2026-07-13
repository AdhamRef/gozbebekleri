"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, RefreshCw, Route } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCALE_OPTIONS } from "@/lib/locales";

type Sender = { id: string; name: string; displayName: string | null; channel: string };
type Rule = {
  id: string;
  channel: string;
  locale: string | null;
  country: string | null;
  purpose: string | null;
  senderId: string;
  fallbackSenderId: string | null;
  priority: number;
  enabled: boolean;
  notes: string | null;
};

const CHANNELS = ["WHATSAPP", "EMAIL", "SMS"] as const;
const PURPOSES = ["", "MARKETING", "UTILITY", "TRANSACTIONAL", "AUTHENTICATION"] as const;
const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل SMS" };

export default function RoutingPage() {
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [senders, setSenders] = React.useState<Sender[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const senderName = (id: string | null) => senders.find((s) => s.id === id)?.name ?? (id ? "—" : "—");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/routing", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error();
      setRules(json.rules ?? []);
      setSenders(json.senders ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function togglePatch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/dashboard/operations/communication/routing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      toast.error("تعذّر التحديث");
    }
  }

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#025EB8]">مركز التواصل</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">قواعد توجيه المُرسِلين</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              اختر أي مُرسِل يُستخدم حسب اللغة والدولة والغرض، مع مُرسِل بديل عند الحاجة. إعداد فقط — لا إرسال.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
            <Button className="gap-2 font-bold" onClick={() => setCreating((v) => !v)}>
              <Plus className="h-4 w-4" /> قاعدة جديدة
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">
          التوجيه إعداد فقط حتى تفعيل الإرسال عبر المزود. لا يتم إرسال أي رسالة من هذه الصفحة.
        </CardContent>
      </Card>

      {senders.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm leading-6 text-amber-900">
            لا يوجد مُرسِلون بعد. أضف مُرسِلين أولًا من صفحة «مُرسِلو التواصل» قبل إنشاء قواعد التوجيه.
            <Link href="/dashboard/operations/communication/senders" className="mr-1 font-bold text-[#025EB8] underline">فتح المُرسِلين</Link>
          </CardContent>
        </Card>
      ) : null}

      {creating && senders.length > 0 ? <RuleForm senders={senders} onDone={() => { setCreating(false); void load(); }} onCancel={() => setCreating(false)} /> : null}

      <RoutingPreview senders={senders} />

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>
      ) : failed ? (
        <Card className="border-rose-200 bg-rose-50"><CardContent className="p-6 text-center text-sm font-semibold text-rose-700">تعذّر تحميل القواعد. حدّث الصفحة.</CardContent></Card>
      ) : rules.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-slate-500">لا توجد قواعد توجيه بعد. تُستخدم قدرات المُرسِل الافتراضية حتى تُضيف قاعدة.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="p-3 text-right font-semibold">القناة</th>
                    <th className="p-3 text-right font-semibold">اللغة</th>
                    <th className="p-3 text-right font-semibold">الدولة</th>
                    <th className="p-3 text-right font-semibold">الغرض</th>
                    <th className="p-3 text-right font-semibold">المُرسِل</th>
                    <th className="p-3 text-right font-semibold">البديل</th>
                    <th className="p-3 text-center font-semibold">الأولوية</th>
                    <th className="p-3 text-center font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3">{channelLabel[r.channel] ?? r.channel}</td>
                      <td className="p-3">{r.locale ?? "الكل"}</td>
                      <td className="p-3">{r.country ?? "الكل"}</td>
                      <td className="p-3">{r.purpose ?? "الكل"}</td>
                      <td className="p-3 font-semibold">{senderName(r.senderId)}</td>
                      <td className="p-3 text-slate-500">{r.fallbackSenderId ? senderName(r.fallbackSenderId) : "—"}</td>
                      <td className="p-3 text-center">{r.priority}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => togglePatch(r.id, { enabled: !r.enabled })}>
                          <Badge variant="outline" className={r.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}>{r.enabled ? "مُفعّلة" : "معطّلة"}</Badge>
                        </button>
                      </td>
                    </tr>
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

function RuleForm({ senders, onDone, onCancel }: { senders: Sender[]; onDone: () => void; onCancel: () => void }) {
  const [channel, setChannel] = React.useState("WHATSAPP");
  const [locale, setLocale] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [senderId, setSenderId] = React.useState("");
  const [fallbackSenderId, setFallbackSenderId] = React.useState("");
  const [priority, setPriority] = React.useState(100);
  const [saving, setSaving] = React.useState(false);
  const channelSenders = senders.filter((s) => s.channel === channel);

  async function save() {
    if (!senderId) {
      toast.error("اختر مُرسِلًا أساسيًا");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, locale: locale || null, country: country || null, purpose: purpose || null, senderId, fallbackSenderId: fallbackSenderId || null, priority }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      toast.success("تم إنشاء القاعدة");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">قاعدة توجيه جديدة</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Field label="القناة"><Select value={channel} onChange={(v) => { setChannel(v); setSenderId(""); setFallbackSenderId(""); }} options={CHANNELS.map((c) => ({ value: c, label: channelLabel[c] }))} /></Field>
        <Field label="اللغة"><Select value={locale} onChange={setLocale} options={[{ value: "", label: "كل اللغات" }, ...LOCALE_OPTIONS.map((l) => ({ value: l.code, label: l.label }))]} /></Field>
        <Field label="الدولة (رمز، اختياري)"><Input value={country} onChange={setCountry} /></Field>
        <Field label="الغرض"><Select value={purpose} onChange={setPurpose} options={PURPOSES.map((p) => ({ value: p, label: p || "الكل" }))} /></Field>
        <Field label="المُرسِل الأساسي"><Select value={senderId} onChange={setSenderId} options={[{ value: "", label: "اختر مُرسِلًا" }, ...channelSenders.map((s) => ({ value: s.id, label: s.displayName || s.name }))]} /></Field>
        <Field label="المُرسِل البديل"><Select value={fallbackSenderId} onChange={setFallbackSenderId} options={[{ value: "", label: "بدون" }, ...channelSenders.map((s) => ({ value: s.id, label: s.displayName || s.name }))]} /></Field>
        <Field label="الأولوية"><Input type="number" value={String(priority)} onChange={(v) => setPriority(Number(v) || 100)} /></Field>
        <div className="flex items-end gap-2">
          <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ</Button>
          <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoutingPreview({ senders }: { senders: Sender[] }) {
  const [channel, setChannel] = React.useState("WHATSAPP");
  const [locale, setLocale] = React.useState("ar");
  const [country, setCountry] = React.useState("");
  const [purpose, setPurpose] = React.useState("MARKETING");
  const [result, setResult] = React.useState<{ selected?: { name: string; provider: string; matchedBy: string } | null; skipped?: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/routing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, locale, country: country || null, purpose }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error();
      setResult(json);
    } catch {
      toast.error("تعذّرت المعاينة");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4 text-[#025EB8]" /> معاينة التوجيه</CardTitle>
        <CardDescription>اختبر أي مُرسِل سيُختار لمدخلات معيّنة — بدون إرسال.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-5">
        <Field label="القناة"><Select value={channel} onChange={setChannel} options={CHANNELS.map((c) => ({ value: c, label: channelLabel[c] }))} /></Field>
        <Field label="اللغة"><Select value={locale} onChange={setLocale} options={LOCALE_OPTIONS.map((l) => ({ value: l.code, label: l.label }))} /></Field>
        <Field label="الدولة"><Input value={country} onChange={setCountry} /></Field>
        <Field label="الغرض"><Select value={purpose} onChange={setPurpose} options={[{ value: "MARKETING", label: "MARKETING" }, { value: "TRANSACTIONAL", label: "TRANSACTIONAL" }]} /></Field>
        <div className="flex items-end"><Button onClick={run} disabled={loading || senders.length === 0} className="w-full gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} معاينة</Button></div>
        {result ? (
          <div className="md:col-span-5">
            {result.skipped ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">لا يوجد مُرسِل مطابق — السبب: <b>{result.reason}</b></div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">سيُستخدم المُرسِل: <b>{result.selected?.name}</b> ({result.selected?.provider}) — المطابقة عبر {result.selected?.matchedBy}</div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{children}</label>;
}
function Input({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#025EB8]" />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#025EB8]">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
