"use client";

import type { LucideIcon } from "lucide-react";
import { CircleAlert, SlashIcon, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual language shared by the البريد / واتساب / SMS channel pages.
 *
 * Each channel has its own lifecycle vocabulary — email is opened, WhatsApp is read, SMS is
 * merely delivered — but the *shape* of the question is identical: how far along the ladder did
 * this message get, and is a missing rung a "no" or an "unknown"? Keeping that judgement in one
 * place is what stops three pages from quietly answering it three different ways.
 */

export type JourneyStage = {
  key: string;
  label: string;
  at: string | null;
  icon: LucideIcon;
  /** Stages known from our own records, not the provider's — never rendered as "unknown". */
  local?: boolean;
};

export function fmtDateTime(value: string | null): { date: string; time: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "Europe/Istanbul" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Europe/Istanbul" }),
  };
}

export function fmtFull(value: string | null): string {
  const dt = fmtDateTime(value);
  return dt ? `${dt.date} · ${dt.time}` : "—";
}

/**
 * The message lifecycle as a strip of pips — the "was it seen?" answer at a glance.
 *
 * A dashed pip means the provider has never reported on that stage, which is materially
 * different from a solid empty one meaning it demonstrably did not happen. Collapsing the two
 * would turn "we aren't receiving events" into "nobody read it".
 */
export function JourneyStrip({
  stages,
  failed,
  skipped,
  skippedReason,
  errorMessage,
  trackingLive,
}: {
  stages: JourneyStage[];
  failed?: boolean;
  skipped?: boolean;
  skippedReason?: string | null;
  errorMessage?: string | null;
  trackingLive: boolean;
}) {
  if (skipped) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400" title={skippedReason ?? undefined}>
        <SlashIcon className="h-3 w-3" /> لم تُرسل
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage) => {
        const done = Boolean(stage.at);
        const dt = fmtDateTime(stage.at);
        const unknown = !done && !stage.local && !trackingLive;
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
                  ? "border-dashed border-slate-300 bg-slate-50 text-slate-300"
                  : "border-slate-200 bg-slate-50 text-slate-300",
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
        );
      })}
      {failed && (
        <span
          title={errorMessage ?? "فشل الإرسال"}
          className="ms-1 flex h-6 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700"
        >
          <TriangleAlert className="h-3 w-3" /> فشل
        </span>
      )}
    </div>
  );
}

export type FunnelStep = {
  label: string;
  value: number;
  pct: number;
  tone: string;
  /** Known without provider feedback — shown even when tracking is dark. */
  always?: boolean;
};

/** Lifecycle stages as proportional bars, so drop-off is seen rather than calculated. */
export function FunnelCard({
  steps,
  trackingLive,
  title = "مسار الرسالة",
  caption = "من إجمالي المقبول",
}: {
  steps: FunnelStep[];
  trackingLive: boolean;
  title?: string;
  caption?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
        <span className="text-[11px] text-slate-400">{caption}</span>
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

/** Says "we are not receiving events" so an empty funnel is never mistaken for disengagement. */
export function TrackingBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="text-xs leading-5 text-amber-900">{children}</div>
    </div>
  );
}

/** Period / status segmented control used across the channel pages. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
            value === option.value ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
