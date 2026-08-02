"use client";

import * as React from "react";
import { Loader2, Copy, Check, MessageCircle, Mail, Webhook, MessageSquare } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Sender = { id: string; name: string; displayName: string | null; channel: string; phoneNumberId: string | null };
type Result = { tone: "ok" | "warn" | "bad"; text: string } | null;

const reasonAr: Record<string, string> = {
  META_WHATSAPP_NOT_CONFIGURED: "إعداد واتساب غير مكتمل",
  META_WHATSAPP_SENDER_MISSING_PHONE_NUMBER_ID: "المُرسِل بلا رقم",
  EMAIL_PROVIDER_NOT_CONFIGURED: "إعداد الإيميل غير مكتمل",
  ELASTIC_EMAIL_NOT_CONFIGURED: "إعداد Elastic Email غير مكتمل",
  ELASTIC_EMAIL_SENDER_NOT_CONFIGURED: "بريد المُرسِل غير مُعد في Elastic Email",
  ELASTIC_EMAIL_REQUEST_FAILED: "فشل الطلب لدى Elastic Email",
  ELASTIC_EMAIL_UNAUTHORIZED: "مفتاح Elastic Email غير صالح",
  ELASTIC_EMAIL_RATE_LIMITED: "تم تجاوز حد الإرسال لدى Elastic Email",
  ELASTIC_EMAIL_REJECTED: "رفض Elastic Email الرسالة",
  BREVO_SMS_NOT_CONFIGURED: "إعداد Brevo للرسائل غير مكتمل",
  BREVO_SMS_REQUEST_FAILED: "فشل الطلب لدى Brevo",
  NETGSM_NOT_CONFIGURED: "إعداد Netgsm غير مكتمل",
  NETGSM_REQUEST_FAILED: "فشل الطلب لدى Netgsm",
  NETGSM_REJECTED: "رفض المزود الرسالة",
  NETGSM_RECIPIENT_NOT_TURKISH: "الرقم ليس تركيًا",
  META_WHATSAPP_REQUEST_FAILED: "فشل الطلب لدى المزود",
  META_WHATSAPP_UNAUTHORIZED: "رمز الوصول غير صالح",
  META_WHATSAPP_INVALID_RESPONSE: "رد غير متوقع من المزود",
};
const ar = (r?: string | null) => (r ? reasonAr[r] ?? r : "");

function statusResult(status: string, reason?: string | null): Result {
  if (status === "SENT") return { tone: "ok", text: "تم الإرسال بنجاح." };
  if (status === "SKIPPED") return { tone: "warn", text: `لم يُرسل — ${ar(reason)}` };
  return { tone: "bad", text: `فشل — ${ar(reason)}` };
}

export function ProviderTestPanel({
  webhookPath,
  signatureConfigured,
  lastWebhookAt,
  emailReady = true,
  smsInternationalReady = false,
  smsTurkeyReady = false,
}: {
  webhookPath: string;
  signatureConfigured: boolean;
  lastWebhookAt: string | null;
  emailReady?: boolean;
  smsInternationalReady?: boolean;
  smsTurkeyReady?: boolean;
}) {
  const [senders, setSenders] = React.useState<Sender[]>([]);
  const [senderId, setSenderId] = React.useState("");
  const [waTo, setWaTo] = React.useState("");
  const [templateName, setTemplateName] = React.useState("");
  const [lang, setLang] = React.useState("ar");
  const [waResult, setWaResult] = React.useState<Result>(null);
  const [waBusy, setWaBusy] = React.useState(false);

  const [emailTo, setEmailTo] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailResult, setEmailResult] = React.useState<Result>(null);
  const [emailBusy, setEmailBusy] = React.useState(false);

  const [smsTo, setSmsTo] = React.useState("");
  const [smsMessage, setSmsMessage] = React.useState("");
  const [smsType, setSmsType] = React.useState<"transactional" | "marketing">("transactional");
  const [smsResult, setSmsResult] = React.useState<Result>(null);
  const [smsBusy, setSmsBusy] = React.useState(false);

  const [copied, setCopied] = React.useState(false);
  const [webhookUrl, setWebhookUrl] = React.useState(webhookPath);

  // Show which provider a test SMS will use, based on the recipient number (+90 → Netgsm, else Brevo).
  const smsIsTurkish = (() => {
    const raw = smsTo.trim();
    if (raw.startsWith("+90") || raw.startsWith("0090")) return true;
    const d = raw.replace(/\D/g, "");
    return d.startsWith("90") && d.length === 12;
  })();
  const smsProviderLabel = smsIsTurkish ? "Netgsm (تركيا)" : "Brevo (دولي)";
  const smsProviderReady = smsIsTurkish ? smsTurkeyReady : smsInternationalReady;

  React.useEffect(() => {
    setWebhookUrl(`${window.location.origin}${webhookPath}`);
    (async () => {
      try {
        const res = await fetch("/api/dashboard/operations/communication/senders", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const list: Sender[] = (json?.senders ?? []).filter((s: Sender) => s.channel === "WHATSAPP" && s.phoneNumberId);
        setSenders(list);
        if (list[0]) setSenderId(list[0].id);
      } catch {
        /* ignore */
      }
    })();
  }, [webhookPath]);

  async function healthCheck() {
    if (!senderId) return toast.error("اختر مُرسِلًا");
    setWaBusy(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/providers/whatsapp/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderId }) });
      const json = await res.json().catch(() => null);
      if (json?.ok) setWaResult({ tone: "ok", text: `جاهز — ${json.displayPhoneNumber ?? ""} · الجودة: ${json.qualityRating ?? "—"}` });
      else setWaResult({ tone: "warn", text: `غير جاهز — ${ar(json?.reason)}` });
    } finally {
      setWaBusy(false);
    }
  }

  async function testWhatsapp() {
    if (!senderId || !waTo.trim() || !templateName.trim()) return toast.error("أكمل الحقول المطلوبة");
    setWaBusy(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/providers/whatsapp/test-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, senderId, to: waTo.trim(), templateName: templateName.trim(), languageCode: lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) setWaResult({ tone: "bad", text: json?.error ? ar(json.error) : "تعذّر الاختبار" });
      else setWaResult(statusResult(json.status, json.reason));
    } finally {
      setWaBusy(false);
    }
  }

  async function testEmail() {
    if (!emailTo.trim()) return toast.error("أدخل بريدًا");
    setEmailBusy(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/providers/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, to: emailTo.trim(), subject: emailSubject.trim() || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) setEmailResult({ tone: "bad", text: json?.error ? ar(json.error) : "تعذّر الاختبار" });
      else setEmailResult(statusResult(json.status, json.reason));
    } finally {
      setEmailBusy(false);
    }
  }

  async function testSms() {
    if (!smsTo.trim()) return toast.error("أدخل رقمًا");
    setSmsBusy(true);
    try {
      const res = await fetch("/api/dashboard/operations/communication/providers/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, to: smsTo.trim(), message: smsMessage.trim() || undefined, type: smsType }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) setSmsResult({ tone: "bad", text: json?.error ? ar(json.error) : "تعذّر الاختبار" });
      else setSmsResult(statusResult(json.status, json.reason));
    } finally {
      setSmsBusy(false);
    }
  }

  const resultCls = (t: Result) => (!t ? "" : t.tone === "ok" ? "text-emerald-700" : t.tone === "warn" ? "text-amber-700" : "text-rose-700");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* WhatsApp test */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4 text-brand" /> اختبار واتساب</CardTitle><CardDescription>يرسل قالبًا معتمدًا واحدًا لرقم اختبار. لا إرسال جماعي.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {senders.length === 0 ? (
            <p className="text-slate-500">أضف رقم واتساب واحدًا على الأقل من صفحة المُرسِلين لتجربة الإرسال.</p>
          ) : (
            <>
              <Field label="المُرسِل"><select value={senderId} onChange={(e) => setSenderId(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm">{senders.map((s) => <option key={s.id} value={s.id}>{s.displayName || s.name}</option>)}</select></Field>
              <Field label="رقم المستلم (اختبار)"><input value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="أدخل رقم المستلم مع رمز الدولة" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="اسم القالب"><input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field>
                <Field label="اللغة"><input value={lang} onChange={(e) => setLang(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={waBusy} onClick={testWhatsapp} className="gap-1">{waBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إرسال اختبار واتساب</Button>
                <Button size="sm" variant="outline" disabled={waBusy} onClick={healthCheck}>فحص الجاهزية</Button>
              </div>
              {waResult ? <p className={`pt-1 text-xs font-semibold ${resultCls(waResult)}`}>{waResult.text}</p> : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email test (Brevo) */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-brand" /> اختبار إيميل (Brevo)</CardTitle><CardDescription>يرسل رسالة اختبار واحدة عبر Brevo.{!emailReady ? " — يحتاج إعداد Brevo." : ""}</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Field label="بريد المستلم"><input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="أدخل بريد المستلم" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field>
          <Field label="العنوان (اختياري)"><input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field>
          <div className="pt-1"><Button size="sm" disabled={emailBusy} onClick={testEmail} className="gap-1">{emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إرسال اختبار إيميل</Button></div>
          {emailResult ? <p className={`pt-1 text-xs font-semibold ${resultCls(emailResult)}`}>{emailResult.text}</p> : null}
        </CardContent>
      </Card>

      {/* SMS test (Netgsm TR / Brevo international) */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-brand" /> اختبار رسالة قصيرة</CardTitle><CardDescription>يختار المزوّد تلقائيًا حسب الرقم: أرقام تركيا (+90) عبر Netgsm، وبقية الأرقام عبر Brevo. رسالة واحدة فقط.</CardDescription></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Field label="رقم المستلم"><input value={smsTo} onChange={(e) => setSmsTo(e.target.value)} placeholder="أدخل الرقم مع رمز الدولة" dir="ltr" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field>
          <Field label="النوع">
            <select value={smsType} onChange={(e) => setSmsType(e.target.value as "transactional" | "marketing")} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm">
              <option value="transactional">تشغيلي (transactional)</option>
              <option value="marketing">تسويقي (marketing)</option>
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="نص الرسالة"><textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} rows={2} placeholder="اكتب نص رسالة الاختبار" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" /></Field></div>
          {smsTo.trim() ? (
            <p className="sm:col-span-2 text-xs">المزوّد المختار: <b className={smsProviderReady ? "text-emerald-700" : "text-amber-700"}>{smsProviderLabel}</b>{!smsProviderReady ? " — يحتاج إعداد" : ""}</p>
          ) : null}
          <div className="sm:col-span-2 pt-1"><Button size="sm" disabled={smsBusy} onClick={testSms} className="gap-1">{smsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إرسال اختبار رسالة</Button></div>
          {smsResult ? <p className={`sm:col-span-2 pt-1 text-xs font-semibold ${resultCls(smsResult)}`}>{smsResult.text}</p> : null}
        </CardContent>
      </Card>

      {/* Webhook info */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Webhook className="h-4 w-4 text-brand" /> استقبال أحداث واتساب</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <code dir="ltr" className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{webhookUrl}</code>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard?.writeText(webhookUrl); setCopied(true); toast.success("تم نسخ الرابط"); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} نسخ</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <Info label="التحقق بالتوقيع" value={signatureConfigured ? "مُعد" : "غير مُعد"} ok={signatureConfigured} />
            <Info label="آمن للإنتاج" value={signatureConfigured ? "نعم" : "يحتاج رمزًا سريًا"} ok={signatureConfigured} />
            <Info label="آخر حدث مستلم" value={lastWebhookAt ? new Date(lastWebhookAt).toLocaleString("ar") : "لم يُستلم بعد"} ok={!!lastWebhookAt} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-0.5 block text-xs font-bold text-slate-500">{label}</span>{children}</label>;
}
function Info({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"><div className="text-slate-400">{label}</div><div className={`mt-0.5 font-bold ${ok ? "text-emerald-700" : "text-amber-700"}`}>{value}</div></div>;
}
