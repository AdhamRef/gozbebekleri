import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SummaryStat = {
  label: string;
  value: string;
  /** Mark shown in the tinted square — gives each figure a distinct silhouette to scan for. */
  icon?: LucideIcon;
  /** Optional delta, e.g. "+12.4%". Colour is chosen from `trend`. */
  delta?: string;
  trend?: "up" | "down" | "flat";
  /** Extra qualifier under the value, e.g. "كل الوقت". */
  hint?: string;
};

type Props = {
  /** Small uppercase label above the headline figure. */
  eyebrow: string;
  /** The one number this page exists to report. */
  value: string;
  /** Clarifies scope, e.g. "لا تتأثر بالفترة أو التصفية". */
  note?: string;
  /** Secondary counts shown to the side, as chips. */
  stats?: SummaryStat[];
  /** Badge on the eyebrow row, e.g. "كل الوقت" — states the figure's scope at a glance. */
  badge?: string;
  /** Mark on the icon tile. */
  icon?: LucideIcon;
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
 * Hierarchy still comes from typographic scale rather than a colour slab — the figure is the
 * largest thing on the page and sits on a near-white surface so it frames the content instead
 * of fighting it. What the flat version lacked was any sense of being the page's anchor, so
 * this adds depth without weight: a brand wash bled from the leading corner, a soft glow, an
 * icon tile, and the secondary counts promoted from hairline-separated text to real chips.
 *
 * The wash is decorative only. Every value is still slate-900 on white-ish, so contrast never
 * depends on where the gradient happens to land.
 */
export function MetricSummaryBand({
  eyebrow,
  value,
  note,
  stats,
  badge,
  icon: Icon,
  children,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-slate-200/90 bg-white",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(2,94,184,0.28)]",
        className,
      )}
    >
      {/* Decorative only — pointer-events-none so it can never eat a click. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_150%_at_100%_0%,rgba(2,94,184,0.10),transparent_58%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 end-[-3rem] -z-10 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-l from-transparent via-brand/40 to-transparent" />

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_4px_12px_-4px_rgba(2,94,184,0.65)]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              )}
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {eyebrow}
              </p>
              {badge && (
                <span className="rounded-full border border-brand/20 bg-brand/8 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  {badge}
                </span>
              )}
            </div>

            <p className="mt-2.5 bg-gradient-to-bl from-slate-900 to-slate-700 bg-clip-text text-4xl font-bold tabular-nums tracking-tight text-transparent sm:text-[44px] sm:leading-[1.05]">
              {value}
            </p>

            {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
          </div>

          {stats && stats.length > 0 && (
            <div className="ms-auto grid w-full grid-cols-2 gap-2.5 sm:w-auto sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "group/stat relative min-w-[8.5rem] overflow-hidden rounded-xl border border-slate-200/80",
                      "bg-white/70 px-3.5 py-3 backdrop-blur-sm transition-all duration-200",
                      "hover:-translate-y-0.5 hover:border-brand/35 hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(2,94,184,0.45)]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {StatIcon && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand transition-colors group-hover/stat:bg-brand group-hover/stat:text-white">
                          <StatIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <p className="truncate text-[11px] font-medium text-slate-500">{stat.label}</p>
                    </div>

                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <p className="text-[22px] font-bold leading-none tabular-nums text-slate-900">
                        {stat.value}
                      </p>
                      {stat.delta && (
                        <span
                          className={cn(
                            "text-[11px] font-semibold tabular-nums",
                            TREND_CLASS[stat.trend ?? "flat"],
                          )}
                        >
                          {stat.delta}
                        </span>
                      )}
                    </div>

                    {stat.hint && (
                      <p className="mt-1 text-[10px] font-medium text-slate-400">{stat.hint}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {children && <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>}
      </div>
    </section>
  );
}
