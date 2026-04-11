"use client";

import type { ElementType } from "react";
import { useMemo } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

const DASHBOARD_CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  TRY: "₺",
  SAR: "﷼",
  AED: "د.إ",
  KWD: "د.ك",
  EGP: "EGP ",
  QAR: "﷼",
  BHD: "ب.د",
};

function toFiniteNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  teal: { bg: "bg-[#025EB8]/8", text: "text-[#025EB8]", border: "border-[#025EB8]/20" },
  indigo: { bg: "bg-[#025EB8]/8", text: "text-[#025EB8]", border: "border-[#025EB8]/20" },
  amber: { bg: "bg-[#FA5D17]/8", text: "text-[#FA5D17]", border: "border-[#FA5D17]/20" },
  violet: { bg: "bg-[#FA5D17]/8", text: "text-[#FA5D17]", border: "border-[#FA5D17]/20" },
  emerald: { bg: "bg-[#025EB8]/8", text: "text-[#025EB8]", border: "border-[#025EB8]/20" },
  slate: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
  orange: { bg: "bg-[#FA5D17]/8", text: "text-[#FA5D17]", border: "border-[#FA5D17]/20" },
};

export interface StatsMetricCardProps {
  title: string;
  value: unknown;
  icon: ElementType;
  accent: keyof typeof ACCENT_STYLES;
  format?: "money";
  subtitle?: string;
  footnote?: string;
  variant?: "default" | "hero";
  /** Tighter padding + typography for dense grids (e.g. lg:grid-cols-6) */
  compact?: boolean;
}

/**
 * KPI tile: values from stats APIs are **USD**. CountUp was dropped for money — it showed 0 with
 * non-finite `end` / hydration quirks; we format like the dashboard `formatMoney` path.
 */
export function StatsMetricCard({
  title,
  value,
  icon: Icon,
  accent,
  format,
  subtitle,
  footnote,
  variant = "default",
  compact = false,
}: StatsMetricCardProps) {
  const { convertToCurrency, getSelectedCurrency } = useCurrency();
  const styles = ACCENT_STYLES[accent] ?? ACCENT_STYLES.slate;
  const isMoney = format === "money";
  const isHero = variant === "hero";

  const numeric = toFiniteNumber(value);

  const mainText = useMemo(() => {
    if (!isMoney) {
      return Math.round(numeric).toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    const selected = getSelectedCurrency?.() ?? "DEFAULT";
    const decimals = compact
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 2 };

    if (selected === "DEFAULT") {
      const sym = DASHBOARD_CURRENCY_SYMBOL.USD ?? "$";
      return sym + numeric.toLocaleString(undefined, decimals);
    }

    const r = convertToCurrency(numeric);
    if (r?.convertedValue != null && Number.isFinite(r.convertedValue) && r.currency) {
      const sym = DASHBOARD_CURRENCY_SYMBOL[r.currency] ?? `${r.currency} `;
      return sym + r.convertedValue.toLocaleString(undefined, decimals);
    }

    const sym = DASHBOARD_CURRENCY_SYMBOL.USD ?? "$";
    return sym + numeric.toLocaleString(undefined, decimals);
  }, [isMoney, numeric, compact, getSelectedCurrency, convertToCurrency]);

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border shadow-sm overflow-hidden flex items-start gap-3 transition-shadow hover:shadow-md",
        isHero ? "ring-1 ring-[#025EB8]/20 border-[#025EB8]/25 lg:col-span-2 p-4" : compact ? "p-3 gap-2.5" : "p-4 gap-3",
        styles.border
      )}
      dir="rtl"
    >
      <div
        className={cn(
          "rounded-lg shrink-0",
          isHero ? "p-2.5" : compact ? "p-1.5" : "p-2",
          styles.bg,
          styles.text
        )}
      >
        <Icon className={isHero ? "w-5 h-5" : compact ? "w-4 h-4" : "w-4 h-4"} />
      </div>
      <div className="min-w-0 text-right flex-1">
        <p
          className={cn(
            "font-medium text-gray-500 truncate",
            isHero ? "text-sm" : compact ? "text-[10px]" : "text-xs"
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "font-bold text-gray-900 mt-0.5 tabular-nums tracking-tight",
            isHero ? "text-xl sm:text-2xl" : compact ? "text-base" : "text-lg"
          )}
        >
          {mainText}
        </p>
        {subtitle && (
          <p className={cn("text-gray-500 mt-1.5 leading-relaxed", compact ? "text-[10px]" : "text-[11px]")}>
            {subtitle}
          </p>
        )}
        {footnote && (
          <p
            className={cn(
              "text-gray-400 mt-1 leading-relaxed border-t border-gray-100/80 pt-1",
              compact ? "text-[9px]" : "text-[10px]"
            )}
          >
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}
