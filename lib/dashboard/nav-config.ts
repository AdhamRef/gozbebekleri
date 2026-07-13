import type { DashboardPermissionKey } from "./permissions";

// Sidebar Information Architecture — six practical, owner-facing sections in a fixed order.
// Every `key` is an existing DashboardPermissionKey and every `href` is a real, existing route.
// Nothing here configures providers; provider setup lives only under "ربط المنصات والإرسال".
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
    group: "الحملات والتشغيل",
    items: [
      { key: "operations", title: "مركز المحتوى", href: "/dashboard/operations/tasks" },
      { key: "archive", title: "مركز الأرشيف", href: "/dashboard/archive" },
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns" },
      { key: "categories", title: "الحملات والدول", href: "/dashboard/categories" },
      { key: "blog", title: "المدونة", href: "/dashboard/blog" },
    ],
  },
  {
    // Using communication — not configuring providers.
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
    // Setup and connections only — do NOT link this section to the communication center.
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
    group: "الهوية",
    items: [
      { key: "brand", title: "دليل الهوية", href: "/dashboard/brand" },
      { key: "brand", title: "الأصول والشعارات", href: "/dashboard/brand/assets" },
      { key: "brand", title: "الألوان", href: "/dashboard/brand/colors" },
      { key: "brand", title: "الخطوط", href: "/dashboard/brand/typography" },
      { key: "brand", title: "نبرة الخطاب", href: "/dashboard/brand/voice" },
      { key: "brand", title: "قوالب الرسائل", href: "/dashboard/brand/frameworks" },
      { key: "brand", title: "التنزيلات", href: "/dashboard/brand/downloads" },
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

// Assignable route permissions for the staff permissions table. Kept as an explicit list
// (one row per key) rather than derived from the sidebar, so reorganizing or hiding a nav
// item never silently removes a grantable permission. `ads`/`referrals` stay assignable even
// though the marketing pages are no longer surfaced as primary navigation.
export const DASHBOARD_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  group: string;
  title: string;
}[] = [
  { key: "revenue", group: "الرئيسية", title: "اللوحة الرئيسية" },
  { key: "monthly", group: "الرئيسية", title: "التبرعات الشهرية" },
  { key: "bankTransfers", group: "الرئيسية", title: "التحويلات البنكية" },
  { key: "donors", group: "الرئيسية", title: "المتبرعون" },
  { key: "operations", group: "الحملات والتشغيل / التواصل", title: "المحتوى والتواصل" },
  { key: "archive", group: "الحملات والتشغيل", title: "مركز الأرشيف" },
  { key: "campaigns", group: "الحملات والتشغيل", title: "المشاريع" },
  { key: "categories", group: "الحملات والتشغيل", title: "الحملات والدول" },
  { key: "blog", group: "الحملات والتشغيل", title: "المدونة" },
  { key: "platformConnections", group: "ربط المنصات والإرسال", title: "ربط المنصات والإرسال" },
  { key: "brand", group: "الهوية", title: "الهوية" },
  { key: "team", group: "الإدارة", title: "الفريق" },
  { key: "generalSettings", group: "الإدارة", title: "الإعدادات" },
  { key: "logs", group: "الإدارة", title: "السجلات المتقدمة" },
  { key: "ads", group: "النمو والتسويق", title: "مركز التسويق" },
  { key: "referrals", group: "النمو والتسويق", title: "الحملات والروابط" },
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
