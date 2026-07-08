import type { DashboardPermissionKey } from "./permissions";

// Navigation aligned to the Dashboard Operating System architecture. Every `key` is an
// existing DashboardPermissionKey and every `href` is a real route — groups are the only
// thing reorganized, plus the Communication Center is now surfaced under Operations.
export const DASHBOARD_NAV_GROUPS: {
  group: string;
  items: { key: DashboardPermissionKey; title: string; href: string }[];
}[] = [
  {
    group: "الرئيسية",
    items: [
      { key: "revenue", title: "نظرة عامة", href: "/dashboard" },
    ],
  },
  {
    group: "النمو والتسويق",
    items: [
      { key: "ads", title: "مركز التسويق", href: "/dashboard/marketing" },
      { key: "referrals", title: "الحملات والروابط", href: "/dashboard/link-generator" },
      { key: "ads", title: "التتبع والنتائج", href: "/dashboard/conversion-events" },
    ],
  },
  {
    group: "التشغيل اليومي",
    items: [
      { key: "operations", title: "مركز التشغيل", href: "/dashboard/operations" },
      { key: "operations", title: "المحتوى والمهام", href: "/dashboard/operations/tasks" },
      { key: "operations", title: "التقويم", href: "/dashboard/operations/calendar" },
    ],
  },
  {
    group: "التواصل",
    items: [
      { key: "operations", title: "مركز التواصل", href: "/dashboard/operations/communication" },
      { key: "operations", title: "الحملات", href: "/dashboard/operations/communication/campaigns" },
      { key: "operations", title: "المحادثات", href: "/dashboard/operations/communication/inbox" },
      { key: "operations", title: "الجمهور", href: "/dashboard/operations/communication/audiences" },
      { key: "operations", title: "القوالب", href: "/dashboard/operations/communication/templates" },
      { key: "operations", title: "النتائج", href: "/dashboard/operations/communication/reports" },
    ],
  },
  {
    group: "المحتوى",
    items: [
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns" },
      { key: "categories", title: "الحملات التبرعية", href: "/dashboard/categories" },
      { key: "blog", title: "المدونة", href: "/dashboard/blog" },
    ],
  },
  {
    group: "الأرشيف والهوية",
    items: [
      { key: "archive", title: "الأرشيف الذكي", href: "/dashboard/archive" },
      { key: "brand", title: "الهوية", href: "/dashboard/brand" },
    ],
  },
  {
    group: "ربط المنصات والإرسال",
    items: [
      { key: "platformConnections", title: "نظرة عامة", href: "/dashboard/platform-connections" },
      { key: "platformConnections", title: "بكسلات التتبع", href: "/dashboard/platform-connections/tracking" },
      { key: "platformConnections", title: "الحسابات الإعلانية", href: "/dashboard/platform-connections/ad-accounts" },
      { key: "platformConnections", title: "مركز التواصل", href: "/dashboard/platform-connections/communication" },
      { key: "platformConnections", title: "Webhooks", href: "/dashboard/platform-connections/webhooks" },
      { key: "platformConnections", title: "فحص الاتصال", href: "/dashboard/platform-connections/health" },
      { key: "platformConnections", title: "السجلات المتقدمة", href: "/dashboard/platform-connections/logs" },
    ],
  },
  {
    group: "الإدارة",
    items: [
      { key: "donors", title: "المتبرعون", href: "/dashboard/users/donors" },
      { key: "team", title: "الفريق", href: "/dashboard/users/team" },
      { key: "monthly", title: "التبرعات الشهرية", href: "/dashboard/monthly" },
      { key: "bankTransfers", title: "التحويلات البنكية", href: "/dashboard/bank-transfers" },
      { key: "generalSettings", title: "الإعدادات", href: "/dashboard/general/payment-gateways" },
      { key: "logs", title: "السجلات المتقدمة", href: "/dashboard/logs" },
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
