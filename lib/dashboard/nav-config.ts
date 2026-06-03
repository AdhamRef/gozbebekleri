import type { DashboardPermissionKey } from "./permissions";

export const DASHBOARD_NAV_GROUPS: {
  group: string;
  items: { key: DashboardPermissionKey; title: string; href: string }[];
}[] = [
  {
    group: "الإدارة العامة",
    items: [
      { key: "revenue", title: "تحليل الإيرادات", href: "/dashboard" },
      { key: "monthly", title: "التبرعات الشهرية", href: "/dashboard/monthly" },
      { key: "bankTransfers", title: "التحويلات البنكية", href: "/dashboard/bank-transfers" },
      { key: "referrals", title: "روابط التتبع", href: "/dashboard/referrals" },
      { key: "logs", title: "سجل النشاط", href: "/dashboard/logs" },
    ],
  },
  {
    group: "إدارة المستخدمين",
    items: [
      { key: "donors", title: "متبرعين", href: "/dashboard/users/donors" },
      { key: "team", title: "فريق العمل", href: "/dashboard/users/team" },
      { key: "badges", title: "الشارات", href: "/dashboard/badges" },
      { key: "messages", title: "الرسائل", href: "/dashboard/messages" },
      { key: "templates", title: "القوالب", href: "/dashboard/templates" },
    ],
  },
  {
    group: "إدارة المحتوى",
    items: [
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns" },
      { key: "categories", title: "الحملات", href: "/dashboard/categories" },
      { key: "blog", title: "المدونة", href: "/dashboard/blog" },
    ],
  },
  {
    group: "إعدادات الهوية",
    items: [
      { key: "slides", title: "شرائح الهيرو", href: "/dashboard/slides" },
      { key: "ticker", title: "إعدادات التيكر", href: "/dashboard/ticker" },
    ],
  },
  {
    group: "التتبع والإعلانات",
    items: [
      { key: "ads", title: "لوحة التنفيذ", href: "/dashboard/marketing-intelligence/executive-overview" },
      { key: "ads", title: "خريطة النظام", href: "/dashboard/marketing-intelligence/system-map" },
      { key: "ads", title: "مركز التسويق", href: "/dashboard/marketing-intelligence" },
      { key: "ads", title: "مركز الإجراءات", href: "/dashboard/marketing-intelligence/action-items" },
      { key: "ads", title: "بيانات المنصات", href: "/dashboard/marketing-intelligence/platform-metrics" },
      { key: "ads", title: "تدقيق قيمة التحويلات", href: "/dashboard/marketing-intelligence/conversion-value-audit" },
      { key: "ads", title: "اختبار النظام", href: "/dashboard/marketing-intelligence/test-checklist" },
      { key: "ads", title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center" },
      { key: "ads", title: "حالة المنصات", href: "/dashboard/marketing-intelligence/platform-status" },
      { key: "ads", title: "أداء الروابط", href: "/dashboard/marketing-intelligence/campaign-links" },
      { key: "ads", title: "الحملات والإعلانات", href: "/dashboard/ads" },
      { key: "ads", title: "سجل التحويلات", href: "/dashboard/conversion-events" },
      { key: "referrals", title: "الروابط التسويقية", href: "/dashboard/link-generator" },
      { key: "pixels", title: "إعدادات التتبع", href: "/dashboard/pixels" },
      { key: "platformConnections", title: "ربط المنصات", href: "/dashboard/marketing/connections" },
    ],
  },
  {
    group: "اعدادات عامة",
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

export const DASHBOARD_PERMISSION_ROWS = DASHBOARD_NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    key: item.key,
    group: g.group,
    title: item.title,
  })),
);

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
