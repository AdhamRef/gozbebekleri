"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, FlaskConical } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LocaleBreakdown = { locale: string; label: string; total: number; eligible: number; needsReview: number; missingContact: number; optedOut: number; doNotContact: number };
type Coverage = { locales: { locale: string; label: string; status: string; fallbackLocale?: string; recipientCount: number }[]; missingWithRecipients: { locale: string; label: string; recipientCount: number }[]; canSendWithoutDecision: boolean };
type CoverageGate = { ok: boolean; missingWithRecipients: { locale: string; label: string; recipientCount: number }[]; undecided: string[] };
type Campaign = { id: string; name: string; channel: string; purpose: string; status: string; audienceSegmentKey: string | null; templateGroupId: string | null; senderRoutingMode: string; metadata: Record<string, unknown> | null };
type Detail = { campaign: Campaign; breakdown: { locales: LocaleBreakdown[]; totals: LocaleBreakdown } | null; templates: { id: string; name: string; availableLocales: string[] }[]; senders: { id: string; name: string; displayName: string | null }[]; coverage: Coverage | null; coverageGate: CoverageGate | null; sendEnabled: boolean };

const statusLabel: Record<string, string> = { DRAFT: "مسودة", REVIEW: "قيد المراجعة", APPROVED: "معتمدة", SCHEDULED: "مجدولة", SENDING: "جارٍ الإرسال", SENT: "أُرسلت", CANCELLED: "ملغاة", FAILED: "فشلت" };
const covLabel: Record<string, string> = { EXISTS: "متوفّرة", FALLBACK: "بديل", MISSING: "ناقصة" };
const covClass: Record<string, string> = { EXISTS: "border-emerald-200 bg-emerald-50 text-emerald-700", FALLBACK: "border-amber-200 bg-amber-50 text-amber-700", MISSING: "border-rose-200 bg-rose-50 text-rose-700" };

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const base = `/api/dashboard/operations/communication/campaigns/${id}`;
  const [data, setData] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [previewText, setPreviewText] = React.useState<{ locale: string; subject: string | null; body: string; usedFallback: boolean } | null>(null);
  const [scheduleAt, setScheduleAt] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
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
      toast.error(e instanceof Error ? e.message : "تعذّر التنفيذ");
    } finally {
      setBusy(false);
    }
  }

  async function preview(locale: string) {
    try {
      const res = await fetch(`${base}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", locale }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      setPreviewText({ locale, subject: json.rendered.subject, body: json.rendered.body, usedFallback: json.rendered.usedFallback });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّرت المعاينة");
    }
  }

  async function test(locale: string) {
    try {
      const res = await fetch(`${base}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", locale }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      toast.success(json.status === "SKIPPED" ? `تم إنشاء سجل تجهيز (لم يُرسل — ${json.reason})` : "تم إنشاء سجل تجهيز");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إنشاء السجل");
    }
  }

  async function sendNow() {
    if (!window.confirm("سيتم تنفيذ إرسال الحملة الآن للمؤهّلين فقط. متابعة؟")) return;
    setBusy(true);
    try {
      const res = await fetch(`${base}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      const s = json.summary;
      toast.success(`اكتمل التنفيذ — أُرسل ${s.sent}، تخطّي ${s.skipped}، فشل ${s.failed}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الإرسال");
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
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "failed");
      toast.success("تمت الجدولة");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّرت الجدولة");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div>;
  }

  const { campaign, breakdown, templates, senders, coverage, coverageGate } = data;
  const editable = campaign.status === "DRAFT" || campaign.status === "REVIEW";
  const decisions = (campaign.metadata?.coverageDecisions ?? {}) as Record<string, string>;

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-white/70">مركز التواصل / حملة</p>
            <h1 className="mt-1.5 text-2xl font-black">{campaign.name}</h1>
            <p className="mt-1 text-sm text-white/80">{campaign.channel} · {campaign.purpose} · <Badge variant="outline" className="border-white/40 text-white">{statusLabel[campaign.status] ?? campaign.status}</Badge></p>
          </div>
          <Button asChild variant="secondary" className="gap-2 font-bold"><Link href="/dashboard/operations/communication/campaigns">كل الحملات <ArrowLeft className="h-4 w-4" /></Link></Button>
        </div>
      </section>

      {!data.sendEnabled ? (
        <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm font-semibold leading-6 text-amber-800">الإرسال غير مفعّل بعد لهذه القناة — يحتاج إعداد المزود. يمكنك تجهيز الحملة واعتمادها الآن، وسيتم الإرسال بعد اكتمال الإعداد.</CardContent></Card>
      ) : null}

      {/* 1 — Audience */}
      <Step n={1} title="الجمهور">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">شريحة اللغة</span>
            <select disabled={!editable} value={campaign.audienceSegmentKey ?? "all"} onChange={(e) => patch({ audienceSegmentKey: e.target.value === "all" ? null : e.target.value }, "تم تحديث الجمهور")} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="all">كل اللغات</option>
              {breakdown?.locales.map((l) => <option key={l.locale} value={l.locale}>{l.label}</option>)}
            </select>
          </label>
        </div>
        {breakdown ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
                <th className="p-2 text-right">اللغة</th><th className="p-2 text-center">مؤهّل</th><th className="p-2 text-center">يحتاج مراجعة</th><th className="p-2 text-center">بلا وسيلة</th><th className="p-2 text-center">غير موافق</th><th className="p-2 text-center">عدم التواصل</th>
              </tr></thead>
              <tbody>
                {breakdown.locales.filter((l) => l.total > 0).map((l) => (
                  <tr key={l.locale} className="border-b last:border-0">
                    <td className="p-2 font-semibold">{l.label}</td>
                    <td className="p-2 text-center text-emerald-700">{l.eligible}</td>
                    <td className="p-2 text-center text-amber-700">{l.needsReview}</td>
                    <td className="p-2 text-center text-slate-500">{l.missingContact}</td>
                    <td className="p-2 text-center text-slate-500">{l.optedOut}</td>
                    <td className="p-2 text-center text-rose-700">{l.doNotContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Step>

      {/* 2 — Template */}
      <Step n={2} title="القالب">
        {templates.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد قوالب لهذه القناة بعد. أنشئ قالبًا من صفحة القوالب أولًا.</p>
        ) : (
          <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">اختر القالب</span>
            <select disabled={!editable} value={campaign.templateGroupId ?? ""} onChange={(e) => patch({ templateGroupId: e.target.value || null }, "تم اختيار القالب")} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="">— اختر —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.availableLocales.join(", ")})</option>)}
            </select>
          </label>
        )}
      </Step>

      {/* 3 — Language coverage */}
      <Step n={3} title="تغطية اللغات">
        {!coverage ? (
          <p className="text-sm text-slate-500">اختر جمهورًا وقالبًا لعرض تغطية اللغات.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {coverage.locales.map((c) => (
                <Badge key={c.locale} variant="outline" className={covClass[c.status]}>{c.label}: {covLabel[c.status]}{c.fallbackLocale ? ` → ${c.fallbackLocale}` : ""} ({c.recipientCount})</Badge>
              ))}
            </div>
            {coverage.missingWithRecipients.length > 0 ? (
              <div className="mt-3 space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-bold text-rose-700">لغات ناقصة لها متبرعون — اختر بديلًا أو استبعادًا لكل لغة قبل الاعتماد:</p>
                {coverage.missingWithRecipients.map((m) => (
                  <div key={m.locale} className="flex items-center justify-between gap-2 text-sm">
                    <span>{m.label} ({m.recipientCount})</span>
                    <select disabled={!editable} value={decisions[m.locale] ?? ""} onChange={(e) => patch({ metadata: { coverageDecisions: { ...decisions, [m.locale]: e.target.value } } }, "تم حفظ القرار")} className="rounded-md border border-slate-200 px-2 py-1 text-xs">
                      <option value="">— قرار —</option>
                      <option value="FALLBACK">استخدام لغة بديلة</option>
                      <option value="EXCLUDE">استبعاد هذه اللغة</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> كل اللغات المطلوبة مغطّاة.</p>
            )}
          </>
        )}
      </Step>

      {/* 4 — Template preview per language */}
      <Step n={4} title="معاينة القالب">
        <div className="flex flex-wrap gap-2">
          {(breakdown?.locales.filter((l) => l.total > 0) ?? []).map((l) => (
            <Button key={l.locale} size="sm" variant="outline" disabled={!campaign.templateGroupId} onClick={() => preview(l.locale)}>{l.label}</Button>
          ))}
        </div>
        {previewText ? (
          <div className="mt-3 rounded-xl border bg-white p-3 text-sm">
            <p className="mb-1 text-xs text-slate-400">لغة: {previewText.locale}{previewText.usedFallback ? " (بديل)" : ""}</p>
            {previewText.subject ? <p className="font-bold">{previewText.subject}</p> : null}
            <p className="whitespace-pre-wrap leading-6 text-slate-700">{previewText.body}</p>
          </div>
        ) : null}
      </Step>

      {/* 5 — Sender routing */}
      <Step n={5} title="توجيه المُرسِل">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm"><span className="mb-1 block text-xs font-bold text-slate-500">وضع التوجيه</span>
            <select disabled={!editable} value={campaign.senderRoutingMode} onChange={(e) => patch({ senderRoutingMode: e.target.value }, "تم التحديث")} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="AUTO">تلقائي حسب القواعد</option><option value="FIXED">مُرسِل ثابت</option></select>
          </label>
          <span className="text-xs text-slate-500">{senders.length} مُرسِل متاح لهذه القناة · <Link href="/dashboard/operations/communication/routing" className="text-[#025EB8] underline">معاينة التوجيه</Link></span>
        </div>
      </Step>

      {/* 6 — Test + Approval */}
      <Step n={6} title="اختبار واعتماد">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1" disabled={!campaign.templateGroupId} onClick={() => test(campaign.audienceSegmentKey ?? "ar")}>
            <FlaskConical className="h-4 w-4" /> إنشاء سجل تجهيز
          </Button>
          <span className="text-xs text-slate-500">ينشئ سجلًا في الأرشيف بحالة «تجهيز/متخطّى» دون إرسال.</span>
        </div>
        {coverageGate && !coverageGate.ok ? (
          <p className="mt-2 flex items-center gap-1 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" /> لا يمكن الاعتماد قبل حسم اللغات الناقصة: {coverageGate.undecided.join(", ")}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {campaign.status === "DRAFT" ? <Button size="sm" disabled={busy} onClick={() => patch({ action: "submit_review" }, "أُرسلت للمراجعة")}>إرسال للمراجعة</Button> : null}
          {campaign.status === "REVIEW" ? <Button size="sm" disabled={busy || !!(coverageGate && !coverageGate.ok)} onClick={() => patch({ action: "approve" }, "تم الاعتماد")}>اعتماد</Button> : null}
          {campaign.status === "APPROVED" ? (
            <>
              {data.sendEnabled ? (
                <Button size="sm" disabled={busy} onClick={sendNow}>إرسال الآن</Button>
              ) : (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">الإرسال غير مفعّل بعد — يحتاج إعداد المزود</span>
              )}
              <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
              <Button size="sm" variant="outline" disabled={busy || !scheduleAt} onClick={schedule}>جدولة</Button>
            </>
          ) : null}
          {editable || campaign.status === "APPROVED" || campaign.status === "SCHEDULED" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ action: "cancel" }, "أُلغيت الحملة")}>إلغاء</Button> : null}
        </div>
      </Step>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#025EB8] text-xs font-black text-white">{n}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
