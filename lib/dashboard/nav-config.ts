import type { DashboardPermissionKey } from "./permissions";

/** Sidebar structure (icons applied in DashboardLayoutClient) */
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
      {
        key: "referrals",
        title: "منشئ روابط الموقع",
        href: "/dashboard/link-generator",
      },
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
      { key: "ads", title: "ذكاء التسويق", href: "/dashboard/marketing-intelligence" },
      { key: "ads", title: "إدارة الإعلانات", href: "/dashboard/ads" },
      { key: "referrals", title: "منشئ الحملات والروابط", href: "/dashboard/link-generator" },
      { key: "pixels", title: "البكسلات والتتبع", href: "/dashboard/pixels" },
      {
        key: "platformConnections",
        title: "ربط المنصات والحسابات",
        href: "/dashboard/marketing/connections",
      },
    ],
  },
  {
    group: "اعدادات عامة",
    items: [
      {
        key: "generalSettings",
        title: "بوابات الدفع",
        href: "/dashboard/general/payment-gateways",
      },
      {
        key: "campaigns",
        title: "افتراضي دعم الفريق",
        href: "/dashboard/campaigns/team-support-defaults",
      },
    ],
  },
];

/** Flat iteration order for “first allowed” redirectt */
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

/** Flat list for permission checkboxes in admin user dialog */
export const DASHBOARD_PERMISSION_ROWS = DASHBOARD_NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    key: item.key,
    group: g.group,
    title: item.title,
  })),
);

/**
 * Action permissions — NOT tied to a sidebar route. These let staff perform
 * specific actions inside pages they can already access.
 */
export const ACTION_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "reportsExport",
    title: "تصدير التقارير",
    description:
      "إظهار زر تصدير التقرير والسماح بتنزيل تقارير التبرعات، الإحالات، والاشتراكات الشهرية.",
  },
  {
    key: "donationsEdit",
    title: "تعديل وحذف التبرعات",
    description:
      "السماح بالنقر بزر الفأرة الأيمن على أي تبرع في الجداول لتعديل قيمته/حالته أو حذفه. كل تعديل أو حذف يُحدّث تلقائيًا إجماليات المشاريع والحملات.",
  },
];
