"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent =
  | "emerald"
  | "teal"
  | "amber"
  | "orange"
  | "violet"
  | "indigo"
  | "slate"
  | "blue"
  | "rose"
  | "sky";

const ACCENT_CLASSES: Record<
  Accent,
  { bg: string; icon: string; badge: string }
> = {
  emerald: { bg: "bg-emerald-50",  icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  teal:    { bg: "bg-teal-50",     icon: "text-teal-600",    badge: "bg-teal-100 text-teal-700"       },
  amber:   { bg: "bg-amber-50",    icon: "text-amber-600",   badge: "bg-amber-100 text-amber-700"     },
  orange:  { bg: "bg-orange-50",   icon: "text-orange-600",  badge: "bg-orange-100 text-orange-700"   },
  violet:  { bg: "bg-violet-50",   icon: "text-violet-600",  badge: "bg-violet-100 text-violet-700"   },
  indigo:  { bg: "bg-indigo-50",   icon: "text-indigo-600",  badge: "bg-indigo-100 text-indigo-700"   },
  slate:   { bg: "bg-slate-50",    icon: "text-slate-500",   badge: "bg-slate-100 text-slate-600"     },
  blue:    { bg: "bg-blue-50",     icon: "text-blue-600",    badge: "bg-blue-100 text-blue-700"       },
  rose:    { bg: "bg-rose-50",     icon: "text-rose-600",    badge: "bg-rose-100 text-rose-700"       },
  sky:     { bg: "bg-sky-50",      icon: "text-sky-600",     badge: "bg-sky-100 text-sky-700"         },
};

function formatValue(value: number, format?: "money" | "number" | "percent"): string {
  if (format === "money") {
    if (value >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000)
      return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }
  if (format === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString("ar-SA");
}

interface StatsMetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  accent?: Accent;
  format?: "money" | "number" | "percent";
  subtitle?: string;
  compact?: boolean;
  variant?: "default" | "hero";
}

export function StatsMetricCard({
  title,
  value,
  icon: Icon,
  accent = "slate",
  format,
  subtitle,
  compact,
  variant = "default",
}: StatsMetricCardProps) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.slate;
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm flex flex-col gap-1 transition-shadow hover:shadow-md",
        compact ? "p-3" : "p-4",
        isHero && "ring-2 ring-offset-1 ring-current ring-opacity-20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-medium leading-tight text-slate-700 text-right flex-1",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {title}
        </p>
        <span
          className={cn(
            "rounded-lg p-1.5 shrink-0",
            colors.bg,
            colors.icon,
          )}
        >
          <Icon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </span>
      </div>

      <p
        className={cn(
          "font-bold text-right tabular-nums text-slate-900",
          isHero ? "text-xl" : compact ? "text-base" : "text-lg",
        )}
      >
        {formatValue(value, format)}
      </p>

      {subtitle && (
        <p className="text-[10px] text-slate-400 text-right leading-tight truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
