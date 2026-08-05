"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail, MailCheck, MailOpen, MousePointerClick, TriangleAlert, Search, Loader2,
  RefreshCw, Inbox, SlashIcon, ChevronLeft, ChevronRight, Send, CircleAlert,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { MetricSummaryBand } from "@/components/dashboard/MetricSummaryBand";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CHART_THEME, CHART_STATUS, CHART_TOOLTIP_STYLE } from "@/lib/dashboard/chart-theme";
import { EmailDeliveryDetailsDialog } from "./EmailDeliveryDetailsDialog";
import { cn } from "@/lib/utils";

export type EmailRow = {
  id: string;
  status: string;
  origin: string;
  templateName: string | null;
  renderedSubject: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  recipientUserId: string | null;
  errorMessage: string | null;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  failedAt: string | null;
};

type Payload = {
  summary: {
    total: number; allTimeTotal: number; attempted: number; delivered: number; opened: number;
    clicked: number; failed: number; skipped: number;
    deliveredRate: number; openRate: number; clickRate: number; failedRate: number;
  };
  trackingLive: boolean;
  statusCounts: Record<string, number>;
  timeseries: Array<{ date: string; sent: number; delivered: number; opened: number; failed: number }>;
  topTemplates: Array<{ name: string; count: number }>;
  rows: EmailRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

const PERIODS = [
  { value: 7, label: "٧ أيام" },
  { value: 30, label: "٣٠ يومًا" },
  { value: 90, label: "٩٠ يومًا" },
  { value: 365, label: "سنة" },
];

const STATUS_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "SENT", label: "مُرسل" },
  { value: "opened", label: "مفتوح" },
  { value: "clicked", label: "مُنقَر" },
  { value: "failed", label: "فاشل" },
  { value: "SKIPPED", label: "متخطّى" },
];

function fmtDateTime(value: string | null): { date: string; time: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "Europe/Istanbul" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Europe/Istanbul" }),
  };
}

/**
 * The four states a message passes through, drawn as a compact strip of pips.
 *
 * This is the answer to "was it seen?" at a glance: a lit pip means the provider confirmed that
 * stage, a dim one means it has not happened (yet). Each stage is also a `title` so the exact
 * timestamp is one hover away without spending a column on it.
 */
function JourneyStrip({ row, trackingLive }: { row: EmailRow; trackingLive: boolean }) {
  const failed = row.status === "FAILED" || row.status === "BOUNCED";
  const skipped = row.status === "SKIPPED";

  if (skipped) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400" title={row.errorMessage ?? undefined}>
        <SlashIcon className="h-3 w-3" /> لم يُرسل
      </span>
    );
  }

  const stages = [
    { key: "sent", label: "أُرسل", at: row.sentAt ?? row.createdAt, icon: Send },
    { key: "delivered", label: "وصل", at: row.deliveredAt, icon: MailCheck },
    { key: "opened", label: "فُتح", at: row.openedAt, icon: MailOpen },
    { key: "clicked", label: "نُقر", at: row.clickedAt, icon: MousePointerClick },
  ];

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => {
        const done = Boolean(stage.at);
        const dt = fmtDateTime(stage.at ?? null);
        // Engagement stages can't be trusted as "no" while tracking is dark — mark them unknown
        // rather than negative, so a missing webhook doesn't read as donor disinterest.
        const unknown = !done && i >= 1 && !trackingLive;
        const Icon = stage.icon;
        return (
          <span
            key={stage.key}
            title={
              done ? `${stage.label} — ${dt?.date} ${dt?.time}`
                : unknown ? `${stage.label}: لا توجد بيانات تتبّع`
                  : `${stage.label}: لم يحدث`
            }
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
              done
                ? "border-brand/25 bg-brand/10 text-brand"
                : unknown
                  ? "border-dashed border-slate-200 bg-slate-50 text-slate-300"
                  : "border-slate-200 bg-slate-50 text-slate-300",
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
        );
      })}
      {failed && (
        <span
          title={row.errorMessage ?? "فشل الإرسال"}
          className="ms-1 flex h-6 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700"
        >
          <TriangleAlert className="h-3 w-3" /> فشل
        </span>
      )}
    </div>
  );
}

/** Sent → Delivered → Opened → Clicked, as proportional bars against the accepted count. */
function FunnelCard({ summary, trackingLive }: { summary: Payload["summary"]; trackingLive: boolean }) {
  const steps = [
    { label: "مقبول لدى المزود", value: summary.attempted, pct: 100, tone: CHART_THEME.primary, always: true },
    { label: "وصل", value: summary.delivered, pct: summary.deliveredRate, tone: CHART_STATUS.info },
    { label: "فُتح", value: summary.opened, pct: summary.openRate, tone: CHART_STATUS.success },
    { label: "نُقر", value: summary.clicked, pct: summary.clickRate, tone: CHART_THEME.secondary },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-slate-900">مسار الرسالة</h2>
        <span className="text-[11px] text-slate-400">من إجمالي المقبول</span>
      </div>
      <div className="space-y-2.5">
        {steps.map((step) => {
          const blind = !step.always && !trackingLive;
          return (
            <div key={step.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-600">{step.label}</span>
                <span className="text-[11px] tabular-nums text-slate-500">
                  {blind ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    <>
                      <b className="text-slate-900">{step.value.toLocaleString("en-US")}</b>
                      {!step.always && <span className="ms-1 text-slate-400">{step.pct}%</span>}
                    </>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${blind ? 0 : Math.min(100, step.pct)}%`, backgroundColor: step.tone }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EmailChannelDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState<EmailRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days), status, page: String(page), limit: "25" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/dashboard/communication/email?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "تعذّر تحميل البيانات");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days, status, page, search]);

  useEffect(() => { void load(); }, [load]);

  // Filter changes must reset paging, or page 7 of the old filter silently shows an empty table.
  useEffect(() => { setPage(1); }, [days, status, search]);

  const summary = data?.summary;
  const trackingLive = data?.trackingLive ?? false;

  const chartData = useMemo(
    () => (data?.timeseries ?? []).map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
    [data?.timeseries],
  );

  return (
    <div className="min-h-0" dir="rtl">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <PageHeader
          eyebrow="التواصل"
          title="البريد الإلكتروني"
          description="كل رسالة بريد صادرة، وما حدث لها بعد الإرسال — الوصول والفتح والنقر والفشل."
          icon={Mail}
          actions={
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              تحديث
            </button>
          }
        />

        {/* Tracking blindness is a first-class state, not a footnote: without it every engagement
            figure below reads as an authoritative zero when it is really "we don't know". */}
        {data && !trackingLive && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs leading-5 text-amber-900">
              <b>تتبّع الفتح والنقر غير مُفعّل.</b> لم يصل أي حدث من Elastic Email حتى الآن، لذلك تظهر
              أرقام «وصل» و«فُتح» و«نُقر» فارغة — وهذا يعني «لا توجد بيانات»، وليس «لم يفتحها أحد».
              فعّل الـwebhook في Elastic Email ليبدأ تسجيل الأحداث.
            </div>
          </div>
        )}

        {summary && (
          <MetricSummaryBand
            icon={Mail}
            eyebrow="رسائل البريد المرسلة"
            badge={`آخر ${days} يومًا`}
            value={summary.attempted.toLocaleString("en-US")}
            note="عدد الرسائل التي قبلها مزوّد البريد خلال الفترة. الرسائل المتخطّاة (بدون بريد أو غير مشتركة) غير محسوبة هنا."
            stats={[
              { label: "وصلت", icon: MailCheck, value: trackingLive ? summary.delivered.toLocaleString("en-US") : "—" },
              { label: "فُتحت", icon: MailOpen, value: trackingLive ? summary.opened.toLocaleString("en-US") : "—", hint: trackingLive ? `${summary.openRate}%` : undefined },
              { label: "نُقرت", icon: MousePointerClick, value: trackingLive ? summary.clicked.toLocaleString("en-US") : "—", hint: trackingLive ? `${summary.clickRate}%` : undefined },
              { label: "فشلت", icon: TriangleAlert, value: summary.failed.toLocaleString("en-US"), hint: `${summary.failedRate}%` },
              // Skipped messages are never handed to the provider, so they sit outside every rate
              // above — and they currently outnumber sent mail several times over. Leaving them
              // off the band would make the page report a healthy channel that is mostly silent.
              { label: "متخطّاة", icon: SlashIcon, value: summary.skipped.toLocaleString("en-US") },
            ]}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-slate-900">حركة الإرسال</h2>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDays(p.value)}
                    aria-pressed={days === p.value}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      days === p.value ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {loading && !data ? (
              <div className="h-[220px] animate-pulse rounded-lg bg-slate-50" />
            ) : chartData.length === 0 ? (
              <EmptyState title="لا توجد رسائل في هذه الفترة" description="جرّب فترة أطول." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emailSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_THEME.primary} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART_THEME.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_THEME.axis }} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_THEME.axis }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Area type="monotone" dataKey="sent" name="مُرسل" stroke={CHART_THEME.primary} strokeWidth={2} fill="url(#emailSent)" />
                  <Area type="monotone" dataKey="failed" name="فاشل" stroke={CHART_STATUS.danger} strokeWidth={1.5} fill="transparent" />
                  {trackingLive && (
                    <Area type="monotone" dataKey="opened" name="مفتوح" stroke={CHART_STATUS.success} strokeWidth={1.5} fill="transparent" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>

          {summary && <FunnelCard summary={summary} trackingLive={trackingLive} />}
        </div>

        {/* Table */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="text-[13px] font-semibold text-slate-900">سجل الرسائل</h2>

            <div className="ms-auto flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    aria-pressed={status === s.value}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      status === s.value ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
                className="relative"
              >
                <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="بحث بالبريد أو الموضوع…"
                  className="h-8 w-56 rounded-lg border border-slate-200 bg-white pe-8 ps-3 text-xs text-slate-700 outline-none transition focus:border-brand"
                />
              </form>
            </div>
          </div>

          {error ? (
            <EmptyState title="تعذّر التحميل" description={error} className="m-4" />
          ) : loading && !data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-50" />
              ))}
            </div>
          ) : !data?.rows.length ? (
            <EmptyState
              title="لا توجد رسائل"
              description="لم تُرسل رسائل بريد مطابقة لهذه التصفية."
              icon={Inbox}
              className="m-4"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">المستلم</th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">الموضوع / القالب</th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">المسار</th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">المصدر</th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => {
                      const dt = fmtDateTime(row.createdAt);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setOpenRow(row)}
                          className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col leading-tight">
                              <span className="font-semibold text-slate-800">{row.recipientName || "—"}</span>
                              <span className="text-[11px] text-slate-400" dir="ltr">{row.recipientEmail || "—"}</span>
                            </div>
                          </td>
                          <td className="max-w-[280px] px-3 py-2.5">
                            <div className="flex flex-col leading-tight">
                              <span className="truncate text-slate-700">{row.renderedSubject || "—"}</span>
                              <span className="truncate text-[11px] text-slate-400">{row.templateName || "—"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5"><JourneyStrip row={row} trackingLive={trackingLive} /></td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {row.origin}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                            <div className="flex flex-col leading-tight">
                              <span>{dt?.date}</span>
                              <span className="text-[10px] text-slate-400" dir="ltr">{dt?.time}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5">
                <span className="text-[11px] text-slate-500">
                  {data.pagination.total.toLocaleString("en-US")} رسالة · صفحة {data.pagination.page} من {data.pagination.pages}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-brand hover:text-brand disabled:opacity-40"
                    aria-label="السابق"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pagination.pages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-brand hover:text-brand disabled:opacity-40"
                    aria-label="التالي"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {loading && data && (
          <div className="pointer-events-none fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-white">
            <Loader2 className="h-3 w-3 animate-spin" /> جاري التحديث
          </div>
        )}
      </div>

      <EmailDeliveryDetailsDialog row={openRow} onClose={() => setOpenRow(null)} trackingLive={trackingLive} />
    </div>
  );
}
