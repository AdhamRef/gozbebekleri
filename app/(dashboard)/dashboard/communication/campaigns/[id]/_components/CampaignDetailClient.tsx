"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Send, ShieldCheck, FileText, Users, TriangleAlert, BarChart3, Ban } from "lucide-react";
import { LOCALE_LABELS } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { type CampaignRow, channelMeta, statusMeta, hasResults, audienceLabel } from "../../_components/campaign-ui";

interface LocaleBreakdown {
  locale: string;
  label: string;
  total: number;
  eligible: number;
  needsReview: number;
  missingContact: number;
  optedOut: number;
  doNotContact: number;
}

interface Payload {
  campaign: CampaignRow;
  template: { id: string; name: string; availableLocales: string[] } | null;
  breakdown: { locales: LocaleBreakdown[]; totals: Omit<LocaleBreakdown, "locale" | "label"> };
}

interface SendPlan {
  total: number;
  recipients?: unknown[];
  skipped?: number;
  blocked?: string | null;
  reasons?: Record<string, number>;
  truncated?: boolean;
}

const BLOCKED_LABELS: Record<string, string> = {
  NOT_APPROVED: "الحملة غير معتمدة — اعتمدها أولًا.",
  NO_TEMPLATE: "لم يُختَر قالب لهذه الحملة.",
  NO_AUDIENCE: "لم يُحدَّد جمهور لهذه الحملة.",
  NO_RECIPIENTS: "لا يوجد مستلم مؤهَّل في هذا الجمهور.",
  NOT_CONFIGURED: "لا يوجد مزوّد مُعدّ لهذه القناة.",
};

function Tile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
      <p className={cn("truncate text-lg font-bold tabular-nums", tone ?? "text-slate-900")}>{value}</p>
      <p className="truncate text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

export function CampaignDetailClient({ id }: { id: string }) {
  const [data, setData] = React.useState<Payload | null>(null);
  const [plan, setPlan] = React.useState<SendPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, planRes] = await Promise.all([
        fetch(`/api/communication/campaigns/${id}`, { cache: "no-store" }),
        fetch(`/api/communication/campaigns/${id}/send`, { cache: "no-store" }),
      ]);
      const detail = await detailRes.json();
      if (!detailRes.ok || !detail.ok) throw new Error(detail?.error || "تعذّر تحميل الحملة");
      setData(detail);
      const planJson = await planRes.json().catch(() => null);
      if (planJson?.ok) setPlan(planJson.plan);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const transition = async (action: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/communication/campaigns/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "تعذّر تحديث الحالة");
      toast.success(action === "CONFIRM" ? "تم تأكيد الحملة — يمكنك إرسالها الآن" : "تم تحديث الحالة");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * The only irreversible action on the page, so it asks — naming the real recipient count and the
   * channel, because "هل أنت متأكد؟" alone does not tell anyone what they are about to do.
   */
  const send = async () => {
    const count = plan?.total ?? data?.breakdown.totals.eligible ?? 0;
    const ch = channelMeta(data?.campaign.channel ?? "EMAIL").label;
    if (!window.confirm(`سيتم إرسال هذه الحملة عبر ${ch} إلى ${count} مستلمًا. لا يمكن التراجع بعد الإرسال. هل تريد المتابعة؟`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/communication/campaigns/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const json = await res.json();
      if (json?.summary?.blocked) {
        toast.error(BLOCKED_LABELS[json.summary.blocked] ?? `تعذّر الإرسال: ${json.summary.blocked}`);
      } else if (!res.ok || !json.ok) {
        toast.error(json?.error || "تعذّر الإرسال");
      } else {
        const s = json.summary;
        toast.success(`أُرسلت ${s.sent} · تُخطّيت ${s.skipped} · فشلت ${s.failed}`);
      }
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="me-2 h-6 w-6 animate-spin" /> جاري التحميل…
      </div>
    );
  }
  if (!data) {
    return <p className="py-16 text-center text-sm text-slate-500">تعذّر تحميل الحملة.</p>;
  }

  const { campaign, template, breakdown } = data;
  const ch = channelMeta(campaign.channel);
  const st = statusMeta(campaign.status);
  const ChIcon = ch.icon;
  const showResults = hasResults(campaign);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", ch.tile)}>
          <ChIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{campaign.name}</p>
          <p className="truncate text-[11px] text-slate-500">{ch.label}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium", st.tone)}>{st.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <FileText className="h-3.5 w-3.5" /> القالب
          </p>
          {template ? (
            <>
              <p className="text-[13px] font-medium text-slate-900">{template.name}</p>
              <p className="mt-1.5 flex flex-wrap gap-1">
                {template.availableLocales.map((l) => (
                  <span key={l} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {LOCALE_LABELS[l as keyof typeof LOCALE_LABELS] ?? l}
                  </span>
                ))}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-rose-600">لم يُختَر قالب.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Users className="h-3.5 w-3.5" /> الجمهور
            <span className="font-normal text-slate-500">· {audienceLabel(campaign.audienceSegmentKey, LOCALE_LABELS)}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Tile label="في الجمهور" value={breakdown.totals.total.toLocaleString("en-US")} />
            <Tile label="مؤهَّل" value={breakdown.totals.eligible.toLocaleString("en-US")} tone="text-emerald-700" />
            <Tile
              label="غير متاح"
              value={(breakdown.totals.missingContact + breakdown.totals.optedOut + breakdown.totals.doNotContact).toLocaleString("en-US")}
              tone="text-slate-500"
            />
          </div>
          {breakdown.locales.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1">
              {breakdown.locales.map((l) => (
                <span key={l.locale} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {l.label}: {l.eligible}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {showResults && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <BarChart3 className="h-3.5 w-3.5" /> النتائج
            </p>
            {/* The funnel proper lives on the channel page; this is a summary, not a second
                implementation of the same numbers. */}
            <Link
              href={`${ch.href}?campaign=${campaign.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
            >
              التقرير الكامل في صفحة {ch.label}
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="أُرسلت" value={campaign.sentCount.toLocaleString("en-US")} />
            <Tile label="وصلت" value={campaign.deliveredCount.toLocaleString("en-US")} tone="text-emerald-700" />
            <Tile label="فشلت" value={campaign.failedCount.toLocaleString("en-US")} tone="text-rose-700" />
            <Tile label="تبرعات" value={campaign.donationCount.toLocaleString("en-US")} tone="text-brand" />
          </div>
        </div>
      )}

      {plan?.blocked && (
        <p className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {BLOCKED_LABELS[plan.blocked] ?? plan.blocked}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/communication/campaigns">رجوع للحملات</Link>
        </Button>

        {/* One confirmation, then send. مراجعة and اعتماد were two clicks describing the same
            decision when the author and the approver are the same person. */}
        {(campaign.status === "DRAFT" || campaign.status === "REVIEW") && (
          <Button size="sm" disabled={busy} onClick={() => transition("CONFIRM")} className="gap-1.5 bg-brand hover:bg-brand/90">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            تأكيد الحملة
          </Button>
        )}
        {campaign.status === "APPROVED" && (
          <Button size="sm" disabled={busy} onClick={send} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            إرسال الآن ({plan?.total ?? breakdown.totals.eligible})
          </Button>
        )}
        {["DRAFT", "REVIEW", "APPROVED", "SCHEDULED"].includes(campaign.status) && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => transition("CANCEL")} className="gap-1.5 text-rose-600 hover:text-rose-700">
            <Ban className="h-3.5 w-3.5" />
            إلغاء
          </Button>
        )}
      </div>
    </div>
  );
}
