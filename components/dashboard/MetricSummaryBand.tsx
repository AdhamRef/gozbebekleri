import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
            <div className="ms-auto flex flex-wrap items-stretch gap-2.5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[7.5rem] rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-2.5 backdrop-blur-sm transition-colors hover:border-brand/30 hover:bg-white"
                >
                  <p className="text-[11px] font-medium text-slate-500">{stat.label}</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <p className="text-xl font-bold tabular-nums text-slate-900">{stat.value}</p>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {children && <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>}
      </div>
    </section>
  );
}
