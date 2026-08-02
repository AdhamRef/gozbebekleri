"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, RefreshCw, Star, Radio } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCALE_OPTIONS } from "@/lib/locales";

type Sender = {
  id: string;
  channel: string;
  provider: string;
  name: string;
  displayName: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  senderEmail: string | null;
  smsSender: string | null;
  supportedLocales: string[];
  supportedCountries: string[];
  supportedPurposes: string[];
  status: string;
  isDefault: boolean;
  enabled: boolean;
  priority: number;
};

const CHANNELS = ["WHATSAPP", "EMAIL", "SMS"] as const;
// Only the final-architecture send paths may be picked for a new sender. Legacy ids (TWILIO,
// SENDGRID, BREVO_EMAIL) still exist on historical rows but are never offered as a choice.
const PROVIDERS = ["META_WHATSAPP", "ELASTIC_EMAIL", "BREVO_SMS", "NETGSM_SMS", "CUSTOM"] as const;
const STATUSES = ["NOT_CONFIGURED", "ACTIVE", "NEEDS_ATTENTION", "DISABLED"] as const;
const PURPOSES = ["MARKETING", "UTILITY", "TRANSACTIONAL", "AUTHENTICATION"] as const;

const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل SMS" };
const purposeLabel: Record<string, string> = { MARKETING: "تسويقي", UTILITY: "تشغيلي", TRANSACTIONAL: "معاملات", AUTHENTICATION: "مصادقة" };
const statusLabel: Record<string, string> = {
  ACTIVE: "نشط",
  NEEDS_ATTENTION: "يحتاج مراجعة",
  DISABLED: "معطّل",
  NOT_CONFIGURED: "غير مكتمل الإعداد",
};
const statusClass: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_ATTENTION: "border-amber-200 bg-amber-50 text-amber-700",
  DISABLED: "border-slate-200 bg-slate-50 text-slate-600",
  NOT_CONFIGURED: "border-slate-200 bg-slate-50 text-slate-500",
};

type FormState = {
  id?: string;
  channel: string;
  provider: string;
  name: string;
  displayName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  businessAccountId: string;
  senderEmail: string;
  smsSender: string;
  supportedLocales: string[];
  supportedCountries: string;
  supportedPurposes: string[];
  status: string;
  priority: number;
  enabled: boolean;
};

const emptyForm: FormState = {
  channel: "WHATSAPP",
  provider: "META_WHATSAPP",
  name: "",
  displayName: "",
  phoneNumberId: "",
  displayPhoneNumber: "",
  businessAccountId: "",
  senderEmail: "",
  smsSender: "",
  supportedLocales: [],
  supportedCountries: "",
  supportedPurposes: ["MARKETING", "UTILITY"],
  status: "NOT_CONFIGURED",
  priority: 100,
  enabled: false,
};

export default function SendersPage() {
  const [senders, setSenders] = React.useState<Sender[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/senders", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error("failed");
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

  function startCreate() {
    setForm({ ...emptyForm });
  }
  function startEdit(s: Sender) {
    setForm({
      id: s.id,
      channel: s.channel,
      provider: s.provider,
      name: s.name,
      displayName: s.displayName ?? "",
      phoneNumberId: s.phoneNumberId ?? "",
      displayPhoneNumber: s.displayPhoneNumber ?? "",
      businessAccountId: "",
      senderEmail: s.senderEmail ?? "",
      smsSender: s.smsSender ?? "",
      supportedLocales: s.supportedLocales ?? [],
      supportedCountries: (s.supportedCountries ?? []).join(", "),
      supportedPurposes: s.supportedPurposes ?? [],
      status: s.status,
      priority: s.priority,
      enabled: s.enabled,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      supportedCountries: form.supportedCountries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
    };
    try {
      const res = await fetch("/api/dashboard/operations/communication/senders", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      toast.success(form.id ? "تم تحديث المُرسِل" : "تم إنشاء المُرسِل");
      setForm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/dashboard/operations/communication/senders", {
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
    <main className="space-y-5" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-brand">مركز التواصل / المُرسِلون</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">مُرسِلو التواصل</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
              أرقام واتساب، مُرسِلو الإيميل والرسائل. إعداد فقط — لا يوجد إرسال ولا تظهر أي مفاتيح أو أسرار.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
            <Button className="gap-2 font-bold" onClick={startCreate}>
              <Plus className="h-4 w-4" /> مُرسِل جديد
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">
          هذه الصفحة لإعداد المُرسِلين فقط. لا يوجد إرسال حقيقي ولا اتصال بأي مزود، ولا تُخزَّن أو تُعرض أي مفاتيح API. تفعيل الإرسال يأتي في مرحلة لاحقة بعد ربط المزود.
        </CardContent>
      </Card>

      {form ? <SenderForm form={form} setForm={setForm} onSave={save} onCancel={() => setForm(null)} saving={saving} /> : null}

      {loading ? (
        <div className="flex min-h-[14rem] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : failed ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6 text-center text-sm font-semibold text-rose-700">تعذّر تحميل المُرسِلين. حدّث الصفحة.</CardContent>
        </Card>
      ) : senders.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">
            لا يوجد مُرسِلون بعد. أضف أول مُرسِل واتساب أو إيميل أو رسائل عبر «مُرسِل جديد».
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {senders.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardDescription>{channelLabel[s.channel] ?? s.channel} · {s.provider}</CardDescription>
                    <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                      <Radio className="h-4 w-4 text-brand" /> {s.displayName || s.name}
                      {s.isDefault ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : null}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className={statusClass[s.status]}>{statusLabel[s.status] ?? s.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  {s.displayPhoneNumber ? <span>الرقم: {s.displayPhoneNumber}</span> : null}
                  {s.senderEmail ? <span>الإيميل: {s.senderEmail}</span> : null}
                  {s.smsSender ? <span>مُرسِل SMS: {s.smsSender}</span> : null}
                  <span>الأولوية: {s.priority}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.supportedLocales.length ? s.supportedLocales.map((l) => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>) : <span className="text-xs text-slate-400">كل اللغات</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.supportedPurposes.map((p) => <Badge key={p} variant="outline" className="border-blue-200 bg-blue-50 text-xs text-blue-700">{purposeLabel[p] ?? p}</Badge>)}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(s)}>تعديل</Button>
                  <Button size="sm" variant="outline" onClick={() => patch(s.id, { enabled: !s.enabled })}>{s.enabled ? "تعطيل" : "تفعيل"}</Button>
                  {!s.isDefault ? <Button size="sm" variant="outline" onClick={() => patch(s.id, { makeDefault: true })}>تعيين افتراضي</Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}

function SenderForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const toggleArr = (key: "supportedLocales" | "supportedPurposes", value: string) => {
    const arr = form[key];
    set({ [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] } as Partial<FormState>);
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{form.id ? "تعديل مُرسِل" : "مُرسِل جديد"}</CardTitle>
        <CardDescription>لا تُدخل أي مفاتيح أو رموز وصول هنا — فقط بيانات التعريف والتوجيه.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Field label="القناة"><Select value={form.channel} onChange={(v) => set({ channel: v })} options={CHANNELS.map((c) => ({ value: c, label: channelLabel[c] }))} /></Field>
        <Field label="المزود"><Select value={form.provider} onChange={(v) => set({ provider: v })} options={PROVIDERS.map((p) => ({ value: p, label: p }))} /></Field>
        <Field label="الاسم الداخلي"><Input value={form.name} onChange={(v) => set({ name: v })} /></Field>
        <Field label="الاسم الظاهر"><Input value={form.displayName} onChange={(v) => set({ displayName: v })} /></Field>
        {form.channel === "WHATSAPP" ? <>
          <Field label="Phone Number ID"><Input value={form.phoneNumberId} onChange={(v) => set({ phoneNumberId: v })} /></Field>
          <Field label="الرقم الظاهر"><Input value={form.displayPhoneNumber} onChange={(v) => set({ displayPhoneNumber: v })} /></Field>
          <Field label="Business Account ID"><Input value={form.businessAccountId} onChange={(v) => set({ businessAccountId: v })} /></Field>
        </> : null}
        {form.channel === "EMAIL" ? <Field label="إيميل المُرسِل"><Input value={form.senderEmail} onChange={(v) => set({ senderEmail: v })} /></Field> : null}
        {form.channel === "SMS" ? <Field label="اسم مُرسِل SMS"><Input value={form.smsSender} onChange={(v) => set({ smsSender: v })} /></Field> : null}
        <Field label="الحالة"><Select value={form.status} onChange={(v) => set({ status: v })} options={STATUSES.map((s) => ({ value: s, label: statusLabel[s] }))} /></Field>
        <Field label="الأولوية (الأقل = أفضل)"><Input type="number" value={String(form.priority)} onChange={(v) => set({ priority: Number(v) || 100 })} /></Field>
        <Field label="الدول المدعومة (رموز مفصولة بفواصل)"><Input value={form.supportedCountries} onChange={(v) => set({ supportedCountries: v })} /></Field>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs font-bold text-slate-500">اللغات المدعومة (فارغ = الكل)</p>
          <div className="flex flex-wrap gap-2">
            {LOCALE_OPTIONS.map((l) => (
              <button key={l.code} type="button" onClick={() => toggleArr("supportedLocales", l.code)} className={`rounded-md border px-2 py-1 text-xs ${form.supportedLocales.includes(l.code) ? "border-brand bg-blue-50 text-brand" : "border-slate-200 text-slate-600"}`}>{l.label}</button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs font-bold text-slate-500">الأغراض المدعومة</p>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <button key={p} type="button" onClick={() => toggleArr("supportedPurposes", p)} className={`rounded-md border px-2 py-1 text-xs ${form.supportedPurposes.includes(p) ? "border-brand bg-blue-50 text-brand" : "border-slate-200 text-slate-600"}`}>{purposeLabel[p] ?? p}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> مُفعّل
        </label>
        <div className="flex gap-2 md:col-span-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ</Button>
          <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{children}</label>;
}
function Input({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
