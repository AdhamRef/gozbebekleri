import type { DashboardPermissionKey } from "./permissions";

// Navigation aligned to the Dashboard Operating System architecture. Every `key` is an
// existing DashboardPermissionKey and every `href` is a real route — groups are the only
// thing reorganized, plus the Communication Center is now surfaced under Operations.
export const DASHBOARD_NAV_GROUPS: {
  group: string;
  items: { key: DashboardPermissionKey; title: string; href: string }[];
}[] = [
  {
    group: "عام",
    items: [
      { key: "revenue", title: "تحليل الإيرادات", href: "/dashboard" },
      { key: "revenue", title: "النظرة التنفيذية", href: "/dashboard/system-overview" },
      { key: "monthly", title: "التبرعات الشهرية", href: "/dashboard/monthly" },
      { key: "bankTransfers", title: "التحويلات البنكية", href: "/dashboard/bank-transfers" },
      { key: "logs", title: "سجل النشاط", href: "/dashboard/logs" },
    ],
  },
  {
    group: "التسويق والنمو",
    items: [
      { key: "ads", title: "مركز التسويق والنمو", href: "/dashboard/marketing" },
      { key: "referrals", title: "منشئ الحملات والروابط", href: "/dashboard/link-generator" },
      { key: "ads", title: "أحداث التحويل", href: "/dashboard/conversion-events" },
      { key: "referrals", title: "روابط التتبع", href: "/dashboard/referrals" },
    ],
  },
  {
    group: "المحتوى والتشغيل",
    items: [
      { key: "operations", title: "مركز المحتوى والتشغيل", href: "/dashboard/operations" },
      { key: "operations", title: "مركز التواصل", href: "/dashboard/operations/communication" },
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns" },
      { key: "categories", title: "الحملات", href: "/dashboard/categories" },
      { key: "blog", title: "المدونة", href: "/dashboard/blog" },
    ],
  },
  {
    group: "الأرشيف الذكي",
    items: [
      { key: "archive", title: "الأرشيف الذكي", href: "/dashboard/archive" },
    ],
  },
  {
    group: "المستخدمون والرسائل",
    items: [
      { key: "donors", title: "متبرعين", href: "/dashboard/users/donors" },
      { key: "team", title: "فريق العمل", href: "/dashboard/users/team" },
      { key: "badges", title: "الشارات", href: "/dashboard/badges" },
      { key: "messages", title: "الرسائل (قديم)", href: "/dashboard/messages" },
      { key: "templates", title: "القوالب (قديم)", href: "/dashboard/templates" },
    ],
  },
  {
    group: "الهوية",
    items: [
      { key: "brand", title: "مركز الهوية", href: "/dashboard/brand" },
      { key: "slides", title: "شرائح الهيرو", href: "/dashboard/slides" },
      { key: "ticker", title: "إعدادات التيكر", href: "/dashboard/ticker" },
    ],
  },
  {
    group: "الإعدادات",
    items: [
      { key: "generalSettings", title: "بوابات الدفع", href: "/dashboard/general/payment-gateways" },
      { key: "campaigns", title: "افتراضي دعم الفريق", href: "/dashboard/campaigns/team-support-defaults" },
    ],
  },
];

export const DASHBOARD_NAV_HREFS_ORDERED: string[] =
  DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

export function dashboardHrefToPermissionKey(
  href: string,
): DashboardPermissionKey | null {
  for (const g of DASHBOARD_NAV_GROUPS) {
    const found = g.items.find((i) => i.href === href);
    if (found) return found.key;
  }
  return null;
}

// One row per permission (nav items can repeat a key across groups) so the
// permissions-management table never shows the same permission twice.
export const DASHBOARD_PERMISSION_ROWS = (() => {
  const seen = new Set<DashboardPermissionKey>();
  const rows: { key: DashboardPermissionKey; group: string; title: string }[] = [];
  for (const g of DASHBOARD_NAV_GROUPS) {
    for (const item of g.items) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      rows.push({ key: item.key, group: g.group, title: item.title });
    }
  }
  return rows;
})();

export const ACTION_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "reportsExport",
    title: "تصدير التقارير",
    description: "إظهار زر تصدير التقارير والسماح بتنزيل ملفات التقارير من لوحة التحكم.",
  },
  {
    key: "donationsEdit",
    title: "تعديل وإدارة التبرعات",
    description: "السماح بإدارة بيانات التبرعات من الجداول مع تحديث إجماليات المشاريع والحملات تلقائيًا.",
  },
];
