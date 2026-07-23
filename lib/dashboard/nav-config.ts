import type { DashboardPermissionKey } from "./permissions";

// Sidebar Information Architecture — practical, permission-gated sections in a fixed order.
// Provider setup and operational sync stay under "ربط المنصات والإرسال".
export const DASHBOARD_NAV_GROUPS: {
  group: string;
  items: { key: DashboardPermissionKey; title: string; href: string }[];
}[] = [
  {
    group: "الرئيسية",
    items: [
      { key: "revenue", title: "اللوحة الرئيسية", href: "/dashboard" },
      { key: "monthly", title: "التبرعات الشهرية", href: "/dashboard/monthly" },
      { key: "bankTransfers", title: "التحويلات البنكية", href: "/dashboard/bank-transfers" },
      { key: "donors", title: "المتبرعون", href: "/dashboard/users/donors" },
    ],
  },
  {
    group: "التشغيل",
    items: [
      { key: "operations", title: "المهام", href: "/dashboard/operations/tasks" },
      { key: "operations", title: "المحتوى", href: "/dashboard/operations/content" },
      { key: "operations", title: "التقويم", href: "/dashboard/operations/calendar" },
      { key: "operations", title: "النشر", href: "/dashboard/operations/publishing" },
      { key: "operations", title: "إعادة تنشيط المتبرعين", href: "/dashboard/operations/donor-reactivation" },
      { key: "archive", title: "الأرشيف", href: "/dashboard/archive/collections" },
    ],
  },
  {
    group: "الحملات والمحتوى",
    items: [
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns" },
      { key: "categories", title: "الحملات والدول", href: "/dashboard/categories" },
      { key: "blog", title: "المدونة", href: "/dashboard/blog" },
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
    group: "التسويق",
    items: [
      { key: "ads", title: "نظرة عامة", href: "/dashboard/marketing" },
      { key: "ads", title: "أداء الحملات", href: "/dashboard/marketing/performance" },
      { key: "referrals", title: "الروابط والإسناد", href: "/dashboard/marketing/attribution" },
      { key: "pixels", title: "التتبع والتحويلات", href: "/dashboard/marketing/tracking" },
      { key: "ads", title: "التوصيات", href: "/dashboard/marketing/recommendations" },
    ],
  },
  {
    group: "ربط المنصات والإرسال",
    items: [
      { key: "platformConnections", title: "نظرة عامة", href: "/dashboard/platform-connections" },
      { key: "platformConnections", title: "بكسلات التتبع", href: "/dashboard/platform-connections/tracking" },
      { key: "platformConnections", title: "الحسابات الإعلانية", href: "/dashboard/platform-connections/ad-accounts" },
      { key: "platformConnections", title: "مزودو التواصل والإرسال", href: "/dashboard/platform-connections/communication" },
      { key: "platformConnections", title: "Webhooks", href: "/dashboard/platform-connections/webhooks" },
      { key: "platformConnections", title: "فحص الاتصال", href: "/dashboard/platform-connections/health" },
      { key: "platformConnections", title: "السجلات المتقدمة", href: "/dashboard/platform-connections/logs" },
    ],
  },
  {
    group: "الإدارة",
    items: [
      { key: "team", title: "الفريق", href: "/dashboard/users/team" },
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

export function resolveActiveDashboardHref(pathname: string, hrefs: readonly string[]): string | null {
  return [...hrefs]
    .filter((href) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}

export const DASHBOARD_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  group: string;
  title: string;
}[] = [
  { key: "revenue", group: "الرئيسية", title: "اللوحة الرئيسية" },
  { key: "monthly", group: "الرئيسية", title: "التبرعات الشهرية" },
  { key: "bankTransfers", group: "الرئيسية", title: "التحويلات البنكية" },
  { key: "donors", group: "الرئيسية", title: "المتبرعون" },
  { key: "operations", group: "التشغيل / التواصل", title: "التشغيل والتواصل" },
  { key: "archive", group: "التشغيل", title: "الأرشيف" },
  { key: "campaigns", group: "الحملات والمحتوى", title: "المشاريع" },
  { key: "categories", group: "الحملات والمحتوى", title: "الحملات والدول" },
  { key: "blog", group: "الحملات والمحتوى", title: "المدونة" },
  { key: "ads", group: "التسويق", title: "عرض أداء التسويق والتوصيات" },
  { key: "referrals", group: "التسويق", title: "إدارة الروابط والإسناد" },
  { key: "pixels", group: "التسويق", title: "عرض التتبع والتحويلات" },
  { key: "platformConnections", group: "ربط المنصات والإرسال", title: "ربط المنصات والإرسال" },
  { key: "team", group: "الإدارة", title: "الفريق" },
  { key: "generalSettings", group: "الإدارة", title: "الإعدادات" },
  { key: "logs", group: "الإدارة", title: "السجلات المتقدمة" },
];

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
