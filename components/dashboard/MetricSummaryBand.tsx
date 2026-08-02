import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SummaryStat = {
  label: string;
  value: string;
  /** Optional delta, e.g. "+12.4%". Colour is chosen from `trend`. */
  delta?: string;
  trend?: "up" | "down" | "flat";
};

type Props = {
  /** Small uppercase label above the headline figure. */
  eyebrow: string;
  /** The one number this page exists to report. */
  value: string;
  /** Clarifies scope, e.g. "لا تتأثر بالفترة أو التصفية". */
  note?: string;
  /** Secondary counts shown to the side, separated by hairlines. */
  stats?: SummaryStat[];
  children?: ReactNode;
  className?: string;
};

const TREND_CLASS: Record<NonNullable<SummaryStat["trend"]>, string> = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-slate-400",
};

/**
 * The headline band for an analytics page.
 *
 * Hierarchy comes from typographic scale, not colour: the figure is set at 38px against a
 * plain white surface, so it reads as the page's anchor without a coloured slab competing
 * with the content below it.
 */
export function MetricSummaryBand({ eyebrow, value, note, stats, children, className }: Props) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {eyebrow}
          </p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[38px] sm:leading-[1.1]">
            {value}
          </p>
          {note && <p className="mt-1.5 text-xs text-slate-400">{note}</p>}
        </div>

        {stats && stats.length > 0 && (
          <div className="ms-auto flex flex-wrap items-center gap-x-8 gap-y-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-s border-slate-100 ps-8 first:border-s-0 first:ps-0"
              >
                <p className="text-[11px] font-medium text-slate-400">{stat.label}</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <p className="text-xl font-bold tabular-nums text-slate-800">{stat.value}</p>
                  {stat.delta && (
                    <span className={cn("text-[11px] font-semibold tabular-nums", TREND_CLASS[stat.trend ?? "flat"])}>
                      {stat.delta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {children && <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>}
    </section>
  );
}
