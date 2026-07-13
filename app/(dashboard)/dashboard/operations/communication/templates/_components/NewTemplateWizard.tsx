"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, Check, MessageCircle, Mail, MessageSquare } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALES } from "@/lib/locales";
import { VariableLibrary } from "./VariableLibrary";

type Channel = "EMAIL" | "WHATSAPP" | "SMS";
type Layout = { id: string; name: string; isDefault: boolean };

const API = "/api/dashboard/operations/communication/templates";
const PURPOSES = [
  { key: "MARKETING", label: "تسويقي" },
  { key: "UTILITY", label: "تشغيلي" },
  { key: "TRANSACTIONAL", label: "معاملات" },
  { key: "AUTHENTICATION", label: "مصادقة" },
];
const CHANNELS: { key: Channel; label: string; icon: typeof Mail }[] = [
  { key: "EMAIL", label: "إيميل", icon: Mail },
  { key: "WHATSAPP", label: "واتساب", icon: MessageCircle },
  { key: "SMS", label: "رسائل قصيرة", icon: MessageSquare },
];
const STEPS = ["نوع القالب", "المحتوى", "المتغيرات", "المعاينة والحفظ"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm";

export function NewTemplateWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [layouts, setLayouts] = React.useState<Layout[]>([]);

  // form state
  const [kind, setKind] = React.useState<"CAMPAIGN" | "SYSTEM">("CAMPAIGN");
  const [channel, setChannel] = React.useState<Channel>("WHATSAPP");
  const [language, setLanguage] = React.useState("ar");
  const [purpose, setPurpose] = React.useState("MARKETING");
  const [layoutId, setLayoutId] = React.useState("");
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [preheader, setPreheader] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [ctaText, setCtaText] = React.useState("");
  const [ctaUrl, setCtaUrl] = React.useState("");
  const [footerNote, setFooterNote] = React.useState("");
  const [footerText, setFooterText] = React.useState("");
  const [preview, setPreview] = React.useState<{ rendered: string; unknownVariables: string[] } | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    fetch(`${API}/layouts`, { cache: "no-store" }).then((r) => r.json()).then((j) => {
      const list: Layout[] = j?.layouts ?? [];
      setLayouts(list);
      const def = list.find((l) => l.isDefault) ?? list[0];
      if (def) setLayoutId(def.id);
    }).catch(() => {});
  }, []);

  function insertToken(token: string) {
    const el = bodyRef.current;
    if (!el) { setBody((b) => `${b}${token}`); return; }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + token.length; });
  }

  async function runPreview() {
    const text = channel === "EMAIL" ? [title, body, ctaText].filter(Boolean).join("\n") : body;
    try {
      const res = await fetch(`${API}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      const j = await res.json().catch(() => null);
      if (j) setPreview({ rendered: j.rendered ?? text, unknownVariables: j.unknownVariables ?? [] });
    } catch { setPreview({ rendered: text, unknownVariables: [] }); }
  }

  async function save(markReady: boolean) {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { channel, kind, name, language, purpose };
      if (channel === "EMAIL") Object.assign(payload, { subject, preheader, layoutId: layoutId || null, title, body, ctaText, ctaUrl, footerNote });
      else Object.assign(payload, { body, footerText });
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.id) { setError(j?.error || "تعذّر حفظ القالب"); setSaving(false); return; }
      if (markReady) await fetch(`${API}/${j.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "READY" }) }).catch(() => {});
      router.push("/dashboard/operations/communication/templates");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? (channel === "EMAIL" ? subject.trim() && body.trim() : body.trim().length > 0) : true;

  const missingRequired = [
    ...(name.trim() ? [] : ["اسم القالب"]),
    ...(channel === "EMAIL" && !subject.trim() ? ["الموضوع"] : []),
    ...(body.trim() ? [] : [channel === "EMAIL" ? "النص" : "نص القالب"]),
  ];

  return (
    <div className="space-y-5">
      {/* step indicator */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${i === step ? "border-[#025EB8] bg-[#025EB8] text-white" : i < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {/* STEP 1 */}
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نوع القالب">
              <div className="flex gap-2">
                {(["CAMPAIGN", "SYSTEM"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold ${kind === k ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}>{k === "CAMPAIGN" ? "حملة" : "تلقائي"}</button>
                ))}
              </div>
              <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-600">
                <p><b className="text-slate-800">حملة:</b> يُستخدم داخل حملات التواصل.</p>
                <p><b className="text-slate-800">تلقائي:</b> يُستخدم في رسائل النظام مثل نجاح التبرع أو فشل الدفع.</p>
              </div>
            </Field>
            <Field label="القناة">
              <div className="flex gap-2">
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  return <button key={c.key} type="button" onClick={() => setChannel(c.key)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-bold ${channel === c.key ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]" : "border-slate-200 text-slate-600"}`}><Icon className="h-3.5 w-3.5" /> {c.label}</button>;
                })}
              </div>
              {channel === "SMS" ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-5 text-amber-800">يمكنك حفظ القالب، لكن إرسال الرسائل القصيرة غير مفعّل بعد.</p>
              ) : null}
            </Field>
            <Field label="اسم القالب"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="اسم داخلي واضح" /></Field>
            <Field label="لغة النسخة الأساسية">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
                {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALES[l].label}</option>)}
              </select>
            </Field>
            <Field label="الغرض">
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls}>
                {PURPOSES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </Field>
            {channel === "EMAIL" ? (
              <Field label="التصميم الثابت (Layout)" hint={layouts.length === 0 ? "لا توجد تصاميم بعد — أنشئ تصميمًا ثابتًا أولًا." : undefined}>
                <select value={layoutId} onChange={(e) => setLayoutId(e.target.value)} className={inputCls}>
                  <option value="">بدون تصميم</option>
                  {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}{l.isDefault ? " (افتراضي)" : ""}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
        ) : null}

        {/* STEP 2 */}
        {step === 1 ? (
          <div className="grid gap-4">
            {channel === "EMAIL" ? (
              <>
                <Field label="عنوان الإيميل (Subject)"><input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} /></Field>
                <Field label="نص ما قبل العنوان (Preheader)"><input value={preheader} onChange={(e) => setPreheader(e.target.value)} className={inputCls} /></Field>
                <Field label="العنوان الرئيسي"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></Field>
                <Field label="النص"><textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={inputCls} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="نص زر الإجراء (CTA)"><input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className={inputCls} /></Field>
                  <Field label="رابط الإجراء" hint="استخدم متغيرًا مثل {{receipt_url}} أو رابط حملة ثابت."><input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className={inputCls} dir="ltr" /></Field>
                </div>
                <Field label="ملاحظة التذييل"><input value={footerNote} onChange={(e) => setFooterNote(e.target.value)} className={inputCls} /></Field>
              </>
            ) : (
              <>
                <Field label="نص القالب"><textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={inputCls} /></Field>
                {channel === "SMS" ? <p className="text-xs text-slate-500">عدد الأحرف: <b>{body.length}</b> · الرسائل القصيرة غير مفعّلة للإرسال بعد، لكن يمكنك تجهيز القوالب.</p> : null}
                {channel === "WHATSAPP" ? (
                  <>
                    <Field label="نص التذييل (اختياري)"><input value={footerText} onChange={(e) => setFooterText(e.target.value)} className={inputCls} /></Field>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">هذا القالب محفوظ داخليًا. اعتماد واتساب يتم من Meta حتى تفعيل المزامنة.</p>
                  </>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {/* STEP 3 */}
        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">أدرج المتغيرات داخل النص. يتم التحقق من المتغيرات غير المعروفة في خطوة المعاينة.</p>
            <VariableLibrary onInsert={insertToken} />
            <Field label="النص"><textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={inputCls} /></Field>
          </div>
        ) : null}

        {/* STEP 4 */}
        {step === 3 ? (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-xl border bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div><span className="text-slate-500">القناة:</span> <b className="text-slate-900">{CHANNELS.find((c) => c.key === channel)?.label}</b></div>
              <div><span className="text-slate-500">النوع:</span> <b className="text-slate-900">{kind === "CAMPAIGN" ? "حملة" : "تلقائي"}</b></div>
              <div><span className="text-slate-500">الغرض:</span> <b className="text-slate-900">{PURPOSES.find((p) => p.key === purpose)?.label}</b></div>
              <div><span className="text-slate-500">اللغة:</span> <b className="text-slate-900">{LOCALES[language as keyof typeof LOCALES]?.label ?? language}</b></div>
            </div>
            {missingRequired.length > 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">حقول مطلوبة ناقصة: {missingRequired.join("، ")}</p>
            ) : null}
            <button type="button" onClick={runPreview} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">تحديث المعاينة</button>
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="mb-2 text-xs font-black text-slate-500">المعاينة</p>
              {channel === "EMAIL" && subject ? <p className="mb-1 text-sm font-bold text-slate-800">{subject}</p> : null}
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{preview?.rendered || body || "—"}</p>
            </div>
            {preview?.unknownVariables?.length ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">متغيرات غير معروفة: {preview.unknownVariables.join(", ")}</p> : null}
            {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => save(false)} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ كمسودة</button>
              <button type="button" disabled={saving} onClick={() => save(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white hover:bg-[#024a92] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} حفظ كجاهز</button>
            </div>
          </div>
        ) : null}
      </div>

      {/* nav */}
      <div className="flex items-center justify-between">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 disabled:opacity-40"><ArrowRight className="h-4 w-4" /> السابق</button>
        {step < STEPS.length - 1 ? (
          <button type="button" disabled={!canNext} onClick={() => { if (step === 1) runPreview(); setStep((s) => Math.min(STEPS.length - 1, s + 1)); }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#025EB8] px-4 text-sm font-bold text-white disabled:opacity-40">التالي <ArrowLeft className="h-4 w-4" /></button>
        ) : (
          <Link href="/dashboard/operations/communication/templates" className="text-xs font-bold text-slate-500 hover:underline">إلغاء والعودة</Link>
        )}
      </div>
    </div>
  );
}
