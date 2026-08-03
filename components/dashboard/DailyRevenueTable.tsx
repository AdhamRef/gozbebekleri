"use client";

import { useMemo } from "react";
import { CalendarDays, TrendingUp } from "lucide-react";

export type DailyRevenuePoint = {
  /** Istanbul date key, `YYYY-MM-DD`. */
  date: string;
  amountUSD: number;
  count: number;
  teamSupport?: number;
  fees?: number;
};

type Props = {
  /** One entry per day of the calendar month, already filled for empty days. */
  data: DailyRevenuePoint[];
  loading?: boolean;
  monthLabel: string;
  /** Today's Istanbul date key, so "today" is marked by the same clock the data uses. */
  todayKey: string;
  formatMoney: (value: number) => string;
};

const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Weekday for a `YYYY-MM-DD` key without letting the local timezone shift the date. */
function weekdayAr(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAYS_AR[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "";
}

function dayOfMonth(dateKey: string): number {
  return Number(dateKey.split("-")[2] ?? 0);
}

export function DailyRevenueTable({ data, loading, monthLabel, todayKey, formatMoney }: Props) {
  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + (d.amountUSD ?? 0), 0);
    const totalCount = data.reduce((sum, d) => sum + (d.count ?? 0), 0);
    const max = data.reduce((m, d) => Math.max(m, d.amountUSD ?? 0), 0);
    const active = data.filter((d) => (d.amountUSD ?? 0) > 0);
    const peak = data.reduce<DailyRevenuePoint | null>(
      (best, d) => ((d.amountUSD ?? 0) > (best?.amountUSD ?? 0) ? d : best),
      null
    );
    // Average across days that actually received money — averaging over all 31 days
    // understates the typical day early in the month, when most days haven't happened yet.
    const avgActive = active.length ? total / active.length : 0;
    return { total, totalCount, max, activeDays: active.length, peak, avgActive };
  }, [data]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-100" />
        <div className="space-y-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-slate-50" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      dir="rtl"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand">
            <CalendarDays className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-slate-900">الوارد اليومي</h2>
            <p className="text-xs text-slate-500">تبرعات الاشتراكات المحصّلة يومًا بيوم خلال {monthLabel}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-[11px] text-slate-500">إجمالي الشهر</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{formatMoney(stats.total)}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-4">
        {[
          { label: "أيام بها تحصيل", value: String(stats.activeDays) },
          { label: "عدد التبرعات", value: String(stats.totalCount) },
          { label: "متوسط اليوم النشط", value: formatMoney(stats.avgActive) },
          {
            label: "أعلى يوم",
            value: stats.peak && stats.peak.amountUSD > 0 ? `${dayOfMonth(stats.peak.date)} — ${formatMoney(stats.peak.amountUSD)}` : "—",
          },
        ].map((cell) => (
          <div key={cell.label} className="bg-white px-4 py-2.5">
            <p className="text-[11px] text-slate-500">{cell.label}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-slate-900">{cell.value}</p>
          </div>
        ))}
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        <table className="min-w-full text-right text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="w-14 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">اليوم</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">اليوم من الأسبوع</th>
              <th className="w-28 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">المبلغ</th>
              <th className="w-20 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">التبرعات</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">الحصة</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const amount = row.amountUSD ?? 0;
              const isToday = row.date === todayKey;
              const isFuture = row.date > todayKey;
              // Share of the best day, so the longest bar always fills the column and the
              // shape stays readable regardless of how large the month's numbers are.
              const share = stats.max > 0 ? (amount / stats.max) * 100 : 0;

              return (
                <tr
                  key={row.date}
                  className={`border-b border-slate-100 last:border-0 transition-colors ${
                    isToday ? "bg-brand-50/60" : amount > 0 ? "hover:bg-slate-50/70" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold tabular-nums ${
                        isToday
                          ? "bg-brand text-white"
                          : amount > 0
                            ? "bg-slate-100 text-slate-700"
                            : "text-slate-300"
                      }`}
                    >
                      {dayOfMonth(row.date)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 ${isFuture ? "text-slate-300" : "text-slate-500"}`}>
                    {weekdayAr(row.date)}
                    {isToday && <span className="ms-2 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">اليوم</span>}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono tabular-nums ${
                      amount > 0 ? "font-semibold text-slate-900" : "text-slate-300"
                    }`}
                  >
                    {isFuture && amount === 0 ? "—" : formatMoney(amount)}
                  </td>
                  <td className={`px-3 py-2 tabular-nums ${row.count > 0 ? "text-slate-700" : "text-slate-300"}`}>
                    {isFuture && row.count === 0 ? "—" : row.count}
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${isToday ? "bg-brand" : "bg-brand/55"}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!data.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  لا توجد بيانات لهذا الشهر بعد.
                </td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-50">
              <tr className="border-t border-slate-200">
                <td colSpan={2} className="px-3 py-2.5 text-[12px] font-semibold text-slate-700">
                  الإجمالي
                </td>
                <td className="px-3 py-2.5 font-mono text-[13px] font-bold tabular-nums text-slate-900">
                  {formatMoney(stats.total)}
                </td>
                <td className="px-3 py-2.5 text-[13px] font-bold tabular-nums text-slate-900">{stats.totalCount}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
