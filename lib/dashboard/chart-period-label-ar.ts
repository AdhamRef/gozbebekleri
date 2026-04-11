/** Matches dashboard chart period select + custom range inputs */
export type DashboardChartPeriod = "day" | "week" | "month" | "all" | "custom";

const LABELS_AR: Record<DashboardChartPeriod, string> = {
  day: "يوم",
  week: "أسبوع",
  month: "شهر",
  all: "كل الوقت",
  custom: "مخصص",
};

/**
 * Arabic label mirroring what the period filter shows:
 * presets by name, custom range as «مخصص: من … إلى …», all time as «كل الوقت».
 */
export function getDashboardChartPeriodLabelAr(
  chartPeriod: DashboardChartPeriod,
  dateFrom: string,
  dateTo: string
): string {
  if (chartPeriod === "all") return LABELS_AR.all;
  if (dateFrom && dateTo) return `مخصص: من ${dateFrom} إلى ${dateTo}`;
  return LABELS_AR[chartPeriod];
}
