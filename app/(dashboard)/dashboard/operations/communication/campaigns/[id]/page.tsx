"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, FlaskConical, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignActionsMenu } from "../_components/CampaignActionsMenu";
import { TrackingLinksPanel } from "../_components/TrackingLinksPanel";

type LocaleBreakdown = { locale: string; label: string; total: number; eligible: number; needsReview: number; missingContact: number; optedOut: number; doNotContact: number };
type Coverage = { locales: { locale: string; label: string; status: string; fallbackLocale?: string; recipientCount: number }[]; missingWithRecipients: { locale: string; label: string; recipientCount: number }[]; canSendWithoutDecision: boolean };
type CoverageGate = { ok: boolean; missingWithRecipients: { locale: string; label: string; recipientCount: number }[]; undecided: string[] };
type Campaign = { id: string; name: string; channel: string; purpose: string; status: string; audienceSegmentKey: string | null; templateGroupId: string | null; senderRoutingMode: string; scheduledAt: string | null; metadata: Record<string, unknown> | null };
type SendPlanSummary = { total: number; eligible: number; skipped: number; reasons: Record<string, number>; providerReady: boolean; senderReady: boolean; willSend: boolean; blocked: string | null };
type TrackingReport = {
  hasTrackingLink: boolean;
  confidence: "دقيق" | "جزئي" | "غير متاح";
  successful: { count: number; valueUSD: number };
  failed: { count: number; valueUSD: number } | null;
  averageUSD: number | null;
  bestLanguage: { locale: string; label: string; valueUSD: number } | null;
  visits: null;
  links: { id: string; url: string; source: string; locale: string | null }[];
} | null;
type Detail = { campaign: Campaign; breakdown: { locales: LocaleBreakdown[]; totals: LocaleBreakdown } | null; templates: { id: string; name: string; availableLocales: string[] }[]; senders: { id: string; name: string; displayName: string | null }[]; coverage: Coverage | null; coverageGate: CoverageGate | null; plan: SendPlanSummary; sendEnabled: boolean; schedulerConfigured: boolean; trackingReport?: TrackingReport };

// All internal reason/error codes mapped to human Arabic — nothing technical reaches the UI.
const reasonAr: Record<string, string> = {
  META_WHATSAPP_NOT_CONFIGURED: "إعداد واتساب غير مكتمل",
  EMAIL_PROVIDER_NOT_CONFIGURED: "إعداد الإيميل غير مكتمل",
  SMS_SEND_NOT_IMPLEMENTED: "الرسائل القصيرة غير مفعّلة بعد",
  PROVIDER_NOT_CONFIGURED: "إعداد المزود غير مكتمل",
  NO_SENDER_AVAILABLE: "لا يوجد مُرسِل مناسب",
  LANGUAGE_COVERAGE_INCOMPLETE: "توجد لغات ناقصة",
  NO_ELIGIBLE_RECIPIENTS: "لا يوجد مستلمون مؤهلون",
  NO_TEMPLATE: "لم يتم اختيار قالب",
  INVALID_CHANNEL: "قناة غير صالحة",
  NEEDS_CONSENT_REVIEW: "يحتاج مراجعة موافقة التواصل",
  NOT_ELIGIBLE: "غير مؤهل للإرسال",
  TEMPLATE_RENDER_FAILED: "تعذّر تجهيز القالب",
  LANGUAGE_EXCLUDED: "لغة مستبعدة",
};
const ar = (code: string | null | undefined) => (code ? reasonAr[code] ?? "غير جاهزة للإرسال" : "غير جاهزة للإرسال");

const channelLabel: Record<string, string> = { WHATSAPP: "واتساب", EMAIL: "إيميل", SMS: "رسائل قصيرة" };
const statusLabel: Record<string, string> = { DRAFT: "مسودة", REVIEW: "قيد المراجعة", APPROVED: "معتمدة", SCHEDULED: "مجدولة", SENDING: "جارٍ الإرسال", SENT: "أُرسلت", SENT_WITH_ISSUES: "أُرسلت مع ملاحظات", BLOCKED: "محجوبة", CANCELLED: "ملغاة", FAILED: "فشلت" };

const STEPS = ["الجمهور", "القالب", "المراجعة", "الإرسال"] as const;

export default function CampaignWizardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const base = `/api/dashboard/operations/communication/campaigns/${id}`;
  const [data, setData] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [showDetails, setShowDetails] = React.useState(false);
  const [previewText, setPreviewText] = React.useState<{ locale: string; subject: string | null; body: string; usedFallback: boolean } | null>(null);
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [audienceLists, setAudienceLists] = React.useState<{ id: string; name: string; type: string }[]>([]);

  React.useEffect(() => {
    fetch("/api/dashboard/operations/communication/audience-lists", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setAudienceLists((j?.lists ?? []).filter((l: { status: string }) => l.status !== "ARCHIVED").map((l: { id: string; name: string; type: string }) => ({ id: l.id, name: l.name, type: l.type }))))
      .catch(() => {});
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error();
      setData(json);
    } catch {
      toast.error("تعذّر تحميل الحملة");
    } finally {
      setLoading(false);
    }
  }, [base]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>, successMsg?: string) {
    setBusy(true);
    try {
      const res = await fetch(base, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      if (successMsg) toast.success(successMsg);
      await load();
    } catch (e) {
      toast.error(ar(e instanceof Error ? e.message : null));
    } finally {
      setBusy(false);
    }
  }

  async function preview(locale: string) {
    try {
      const res = await fetch(`${base}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", locale }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error();
      setPreviewText({ locale, subject: json.rendered.subject, body: json.rendered.body, usedFallback: json.rendered.usedFallback });
    } catch {
      toast.error("تعذّرت المعاينة");
    }
  }

  async function test() {
    if (!data) return;
    try {
      const res = await fetch(`${base}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", locale: data.campaign.audienceSegmentKey ?? "ar" }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error();
      toast.success(json.status === "SKIPPED" ? `تم إنشاء سجل اختبار (لم يُرسل — ${ar(json.reason)})` : "تم إرسال اختبار");
    } catch {
      toast.error("تعذّر الاختبار");
    }
  }

  async function sendNow() {
    if (!window.confirm("سيتم تنفيذ إرسال الحملة الآن للمؤهّلين فقط. متابعة؟")) return;
    setBusy(true);
    try {
      const res = await fetch(`${base}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.reason ?? json?.error ?? "failed");
      const s = json.summary;
      toast.success(`اكتمل التنفيذ — أُرسل ${s.sent}، تخطّي ${s.skipped}، فشل ${s.failed}`);
      await load();
    } catch (e) {
      toast.error(ar(e instanceof Error ? e.message : null));
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!scheduleAt) {
      toast.error("اختر موعدًا");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/schedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }) });
      if (!res.ok) throw new Error();
      toast.success("تمت الجدولة");
      await load();
    } catch {
      toast.error("تعذّرت الجدولة");
    } finally {
      setBusy(false);
    }
  }

  async function runDue() {
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/operations/communication/campaigns/run-due`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("تم تشغيل الحملات المستحقة");
      await load();
    } catch {
      toast.error("تعذّر التشغيل");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>;
  }

  const { campaign, breakdown, templates, coverage, coverageGate, plan } = data;
  const editable = campaign.status === "DRAFT" || campaign.status === "REVIEW";
  const decisions = (campaign.metadata?.coverageDecisions ?? {}) as Record<string, string>;
  const totals = breakdown?.totals;
  const excluded = (totals?.optedOut ?? 0) + (totals?.doNotContact ?? 0);
  const templateName = templates.find((t) => t.id === campaign.templateGroupId)?.name ?? null;
  const audienceLabel = campaign.audienceSegmentKey
    ? campaign.audienceSegmentKey.startsWith("list:")
      ? audienceLists.find((l) => `list:${l.id}` === campaign.audienceSegmentKey)?.name ?? "قائمة"
      : breakdown?.locales.find((l) => l.locale === campaign.audienceSegmentKey)?.label ?? campaign.audienceSegmentKey
    : "كل اللغات";
  const topReason = Object.entries(plan.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const providerStatus = campaign.channel === "SMS" ? { text: "غير مفعّل", cls: "text-slate-400" } : plan.providerReady && plan.senderReady ? { text: "جاهز للإرسال", cls: "text-emerald-600" } : { text: "يحتاج إعداد", cls: "text-amber-600" };
  const previewLocales = (breakdown?.locales.filter((l) => l.total > 0) ?? []).slice(0, 8);

  return (
    <main className="mx-auto max-w-5xl space-y-5" dir="rtl">
      {/* Clean white header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-slate-400">التواصل / حملة</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">{campaign.name}</h1>
            <Badge variant="outline" className="border-slate-200 text-slate-600">{statusLabel[campaign.status] ?? campaign.status}</Badge>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Button asChild variant="outline" className="gap-2"><Link href="/dashboard/operations/communication/campaigns">كل الحملات <ArrowLeft className="h-4 w-4" /></Link></Button>
          <CampaignActionsMenu id={id} status={campaign.status} variant="buttons" />
        </div>
      </div>
      {campaign.status === "SENDING" ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">الحملة قيد الإرسال — العرض فقط، لا تعديل ولا حذف.</div>
      ) : null}

      {/* Progress bar — 2×2 on phones, single row from sm up */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <button key={label} onClick={() => setStep(n)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-right text-sm transition ${active ? "border-[#025EB8] bg-blue-50 text-[#025EB8]" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? "bg-[#025EB8] text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>{done ? "✓" : n}</span>
              <span className="truncate font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      {campaign.channel === "SMS" ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> الرسائل القصيرة غير مفعّلة بعد — يمكنك تجهيز الحملة، لكن لا يمكن اعتمادها أو إرسالها حتى تفعيل مزوّد الرسائل.
        </div>
      ) : null}

      {/* ── Step 1: Audience & channel ── */}
      {step === 1 ? (
        <Card className="border-slate-200"><CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500">القناة</p>
              <Badge variant="outline" className="mt-1 border-[#025EB8]/30 bg-blue-50 text-[#025EB8]">{channelLabel[campaign.channel] ?? campaign.channel}</Badge>
              <p className="mt-1 text-[11px] text-slate-400">لا يمكن تغيير القناة بعد إنشاء الحملة.</p>
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold text-slate-500">الجمهور</span>
              <select disabled={!editable} value={campaign.audienceSegmentKey ?? "all"} onChange={(e) => patch({ audienceSegmentKey: e.target.value === "all" ? null : e.target.value }, "تم تحديث الجمهور")} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                <optgroup label="شريحة تلقائية">
                  <option value="all">كل اللغات</option>
                  {breakdown?.locales.map((l) => <option key={l.locale} value={l.locale}>{l.label}</option>)}
                </optgroup>
                {audienceLists.some((l) => l.type === "CUSTOM") ? (
                  <optgroup label="قائمة مخصصة">
                    {audienceLists.filter((l) => l.type === "CUSTOM").map((l) => <option key={l.id} value={`list:${l.id}`}>{l.name}</option>)}
                  </optgroup>
                ) : null}
                {audienceLists.some((l) => l.type === "TEST") ? (
                  <optgroup label="قائمة اختبار">
                    {audienceLists.filter((l) => l.type === "TEST").map((l) => <option key={l.id} value={`list:${l.id}`}>{l.name}</option>)}
                  </optgroup>
                ) : null}
              </select>
              {campaign.audienceSegmentKey?.startsWith("list:") ? (
                <span className="mt-1 block text-[11px] font-semibold text-amber-700">
                  {audienceLists.find((l) => `list:${l.id}` === campaign.audienceSegmentKey)?.type === "TEST" ? "قائمة اختبار — سيُرسل كاختبار (origin TEST)." : "قائمة مخصصة."}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="إجمالي المتبرعين" value={totals?.total ?? 0} />
            <Stat label="مؤهل للإرسال" value={totals?.eligible ?? 0} tone="text-emerald-700" />
            <Stat label="يحتاج مراجعة" value={totals?.needsReview ?? 0} tone="text-amber-700" />
            <Stat label="بلا وسيلة تواصل" value={totals?.missingContact ?? 0} tone="text-slate-500" />
            <Stat label="مستبعد" value={excluded} tone="text-rose-700" />
          </div>

          <button onClick={() => setShowDetails((v) => !v)} className="flex items-center gap-1 text-xs font-bold text-[#025EB8]"><ChevronDown className={`h-4 w-4 transition ${showDetails ? "rotate-180" : ""}`} /> عرض التفاصيل حسب اللغة</button>
          {showDetails && breakdown ? (
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="p-2 text-right">اللغة</th><th className="p-2 text-center">مؤهّل</th><th className="p-2 text-center">مراجعة</th><th className="p-2 text-center">بلا وسيلة</th><th className="p-2 text-center">مستبعد</th></tr></thead>
                <tbody>
                  {breakdown.locales.filter((l) => l.total > 0).map((l) => (
                    <tr key={l.locale} className="border-b last:border-0"><td className="p-2 font-semibold">{l.label}</td><td className="p-2 text-center text-emerald-700">{l.eligible}</td><td className="p-2 text-center text-amber-700">{l.needsReview}</td><td className="p-2 text-center text-slate-500">{l.missingContact}</td><td className="p-2 text-center text-rose-700">{l.optedOut + l.doNotContact}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <StepNav onNext={() => setStep(2)} />
        </CardContent></Card>
      ) : null}

      {/* ── Step 2: Template & language ── */}
      {step === 2 ? (
        <Card className="border-slate-200"><CardContent className="space-y-4 p-5">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد قوالب لهذه القناة بعد. أنشئ قالبًا من صفحة القوالب أولًا.</p>
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-bold text-slate-500">القالب</span>
              <select disabled={!editable} value={campaign.templateGroupId ?? ""} onChange={(e) => patch({ templateGroupId: e.target.value || null }, "تم اختيار القالب")} className="w-full max-w-md rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="">— اختر قالبًا —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}

          {coverage ? (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500">جاهزية اللغات</p>
              <div className="flex flex-wrap gap-2">
                {coverage.locales.map((c) => {
                  const excludedLang = decisions[c.locale] === "EXCLUDE";
                  const label = excludedLang ? "مستبعد" : c.status === "EXISTS" ? "جاهز" : c.status === "FALLBACK" ? "سيستخدم بديل" : "يحتاج قالب";
                  const cls = excludedLang ? "border-slate-200 bg-slate-50 text-slate-500" : c.status === "EXISTS" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : c.status === "FALLBACK" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700";
                  return <Badge key={c.locale} variant="outline" className={cls}>{c.label}: {label}</Badge>;
                })}
              </div>

              {coverage.missingWithRecipients.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-800">لغات لها متبرعون بلا قالب — اختر قرارًا لكل لغة:</p>
                  {coverage.missingWithRecipients.map((m) => (
                    <div key={m.locale} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{m.label} <span className="text-xs text-slate-400">({m.recipientCount} متبرع)</span></span>
                      <select disabled={!editable} value={decisions[m.locale] ?? ""} onChange={(e) => patch({ metadata: { coverageDecisions: { ...decisions, [m.locale]: e.target.value } } }, "تم حفظ القرار")} className="rounded-md border border-slate-200 px-2 py-1 text-xs">
                        <option value="">أوقف الاعتماد حتى أضيف القالب</option>
                        <option value="FALLBACK">استخدام لغة بديلة</option>
                        <option value="EXCLUDE">استبعاد هذه اللغة</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : campaign.templateGroupId ? (
                <p className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> كل اللغات المطلوبة مغطّاة.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">اختر جمهورًا وقالبًا لعرض جاهزية اللغات.</p>
          )}

          {campaign.templateGroupId && previewLocales.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">معاينة القالب</p>
              <div className="flex flex-wrap gap-2">
                {previewLocales.map((l) => (
                  <button key={l.locale} onClick={() => preview(l.locale)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#025EB8]/40">{l.label}</button>
                ))}
              </div>
              {previewText ? (
                <div className="rounded-xl border border-slate-100 bg-white p-3 text-sm">
                  {previewText.usedFallback ? <p className="mb-1 text-xs text-amber-600">تُعرض بلغة بديلة</p> : null}
                  {previewText.subject ? <p className="font-bold text-slate-800">{previewText.subject}</p> : null}
                  <p className="whitespace-pre-wrap leading-6 text-slate-700">{previewText.body}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </CardContent></Card>
      ) : null}

      {/* ── Step 3: Review ── */}
      {step === 3 ? (
        <Card className="border-slate-200"><CardContent className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="القناة" value={channelLabel[campaign.channel] ?? campaign.channel} />
            <Row label="الجمهور" value={audienceLabel ?? "كل اللغات"} />
            <Row label="القالب" value={templateName ?? "لم يُختر"} />
            <Row label="عدد المؤهلين" value={String(plan.eligible)} />
            <Row label="عدد المستبعدين" value={String(plan.skipped)} />
            <Row label="أعلى سبب استبعاد" value={topReason ? ar(topReason) : "—"} />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">حالة المزود</span>
              <span className={`font-bold ${providerStatus.cls}`}>{providerStatus.text}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">سيتم اختيار رقم الإرسال تلقائيًا حسب اللغة والدولة. <Link href="/dashboard/operations/communication/settings" className="font-bold text-[#025EB8]">تعديل الإعدادات</Link></p>
          </div>

          <TrackingLinksPanel campaignId={id} report={data.trackingReport ?? null} onChanged={load} />

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" disabled={!campaign.templateGroupId} onClick={test}>
              <FlaskConical className="h-4 w-4" /> {data.sendEnabled ? "إرسال اختبار" : "إنشاء سجل اختبار"}
            </Button>
            <span className="text-xs text-slate-400">{data.sendEnabled ? "يرسل رسالة اختبار واحدة." : "ينشئ سجلًا دون إرسال حتى يكتمل إعداد المزود."}</span>
          </div>

          <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="الاعتماد والإرسال" />
        </CardContent></Card>
      ) : null}

      {/* ── Step 4: Approve & send ── */}
      {step === 4 ? (
        <Card className="border-slate-200"><CardContent className="space-y-4 p-5">
          {campaign.status === "SCHEDULED" && campaign.scheduledAt ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
              <p>مجدولة للإرسال في: <b>{new Date(campaign.scheduledAt).toLocaleString("ar")}</b></p>
              <p className="mt-1 text-xs">{data.schedulerConfigured ? "سيتم التنفيذ تلقائيًا عند حلول الموعد." : "سيتم حفظ الموعد، لكن التنفيذ التلقائي يحتاج تفعيل Cron. حتى ذلك الحين شغّلها يدويًا."}</p>
              <button onClick={runDue} disabled={busy} className="mt-1 text-xs font-bold text-[#025EB8] underline">تشغيل يدوي للحملات المستحقة</button>
            </div>
          ) : null}

          {campaign.status === "APPROVED" && !plan.willSend ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" /> {ar(plan.blocked)}</div>
          ) : null}
          {campaign.status === "REVIEW" && coverageGate && !coverageGate.ok ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" /> لا يمكن الاعتماد قبل حسم اللغات الناقصة.</div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {campaign.status === "DRAFT" ? <Button className="w-full sm:w-auto" disabled={busy} onClick={() => patch({ action: "submit_review" }, "أُرسلت للمراجعة")}>إرسال للمراجعة</Button> : null}
            {campaign.status === "REVIEW" ? <Button className="w-full sm:w-auto" disabled={busy || campaign.channel === "SMS" || !!(coverageGate && !coverageGate.ok)} onClick={() => patch({ action: "approve" }, "تم الاعتماد")}>اعتماد الحملة</Button> : null}
            {campaign.status === "APPROVED" ? (
              <>
                <Button className="w-full sm:w-auto" disabled={busy || !plan.willSend} onClick={sendNow}>إرسال الآن</Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-auto sm:px-2 sm:py-1.5 sm:text-xs" />
                  <Button variant="outline" className="w-full sm:w-auto" disabled={busy || !scheduleAt} onClick={schedule}>جدولة</Button>
                </div>
              </>
            ) : null}
          </div>
          {campaign.status === "APPROVED" ? (
            <p className="text-[11px] text-slate-400">{data.schedulerConfigured ? "الجدولة تعمل تلقائيًا — سيتم الإرسال في الموعد المحدد." : "سيتم حفظ الموعد، لكن التنفيذ التلقائي يحتاج تفعيل Cron."}</p>
          ) : null}

          {editable || campaign.status === "APPROVED" || campaign.status === "SCHEDULED" ? (
            <button onClick={() => patch({ action: "cancel" }, "أُلغيت الحملة")} disabled={busy} className="text-xs text-slate-400 underline hover:text-rose-600">إلغاء الحملة</button>
          ) : null}

          <div className="pt-1"><StepNav onBack={() => setStep(3)} /></div>
        </CardContent></Card>
      ) : null}
    </main>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className={`text-2xl font-black ${tone}`}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

function StepNav({ onBack, onNext, nextLabel = "التالي" }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? <Button variant="ghost" className="gap-1 text-slate-500" onClick={onBack}><ArrowRight className="h-4 w-4" /> السابق</Button> : <span />}
      {onNext ? <Button className="gap-1" onClick={onNext}>{nextLabel} <ArrowLeft className="h-4 w-4" /></Button> : <span />}
    </div>
  );
}
