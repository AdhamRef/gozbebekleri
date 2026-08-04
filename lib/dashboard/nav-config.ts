import type { DashboardPermissionKey } from "./permissions";
import type { NavIconName } from "./nav-icons";

export type DashboardNavItem = {
  key: DashboardPermissionKey;
  title: string;
  href: string;
  /** Rendered in the sidebar and the command palette. */
  icon: NavIconName;
  /** Extra search terms for the command palette — English slugs, synonyms, provider names. */
  keywords?: string[];
};

export type DashboardNavGroup = { group: string; items: DashboardNavItem[] };

// Sidebar Information Architecture — practical, permission-gated sections in a fixed order.
// Provider setup and operational sync stay under "ربط المنصات والإرسال".
//
// Every item carries its OWN icon. Icons used to be looked up by `key` (the permission key)
// in DashboardLayoutClient, which meant the six "التواصل" items and the five operations items
// all shared one permission key and therefore rendered the identical MessageSquare glyph —
// the icon column conveyed nothing. Per-item icons fix that.
//
// Titles are also unique across the whole sidebar now. "نظرة عامة" and "السجلات المتقدمة"
// each appeared twice in different groups, and "الحملات" meant message campaigns here but
// fundraising projects two groups up; with a command palette searching these labels,
// ambiguous titles become unusable.
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    group: "الرئيسية",
    items: [
      { key: "revenue", title: "اللوحة الرئيسية", href: "/dashboard", icon: "layoutDashboard", keywords: ["home", "overview", "الرئيسية"] },
      { key: "monthly", title: "التبرعات الشهرية", href: "/dashboard/monthly", icon: "repeat", keywords: ["monthly", "subscriptions", "اشتراكات"] },
      { key: "bankTransfers", title: "التحويلات البنكية", href: "/dashboard/bank-transfers", icon: "landmark", keywords: ["bank", "transfers", "حوالات"] },
      { key: "donors", title: "المتبرعون", href: "/dashboard/users/donors", icon: "users", keywords: ["donors", "users", "متبرعين"] },
    ],
  },
  {
    group: "الحملات والمحتوى",
    items: [
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns", icon: "heart", keywords: ["projects", "campaigns", "مشاريع"] },
      { key: "categories", title: "الحملات والدول", href: "/dashboard/categories", icon: "globe", keywords: ["categories", "countries", "تصنيفات"] },
      { key: "blog", title: "المدونة", href: "/dashboard/blog", icon: "penLine", keywords: ["blog", "posts", "مقالات"] },
      // Built, API-backed, and previously unreachable. Slides and ticker both control what the
      // PUBLIC site renders, so leaving them unlinked meant no one could edit live UI.
      { key: "slides", title: "الشرائح", href: "/dashboard/slides", icon: "images", keywords: ["slides", "slider", "hero"] },
      { key: "ticker", title: "شريط التبرعات", href: "/dashboard/ticker", icon: "ticket", keywords: ["ticker", "marquee"] },
      { key: "badges", title: "الشارات", href: "/dashboard/badges", icon: "award", keywords: ["badges"] },
    ],
  },
  {
    group: "التواصل",
    items: [
      { key: "operations", title: "مركز التواصل", href: "/dashboard/operations/communication", icon: "messageCircle", keywords: ["communication", "hub"] },
      { key: "operations", title: "حملات الرسائل", href: "/dashboard/operations/communication/campaigns", icon: "megaphone", keywords: ["campaigns", "broadcast", "إرسال جماعي"] },
      { key: "operations", title: "المحادثات", href: "/dashboard/operations/communication/inbox", icon: "inbox", keywords: ["inbox", "conversations", "chat"] },
      { key: "operations", title: "الجمهور", href: "/dashboard/operations/communication/audiences", icon: "contact", keywords: ["audiences", "segments", "شرائح"] },
      { key: "operations", title: "قوالب الرسائل", href: "/dashboard/operations/communication/templates", icon: "layoutTemplate", keywords: ["templates"] },
      { key: "operations", title: "تقارير الإرسال", href: "/dashboard/operations/communication/reports", icon: "barChart", keywords: ["reports", "delivery", "نتائج"] },
      // Previously unreachable (no nav entry, no inbound link) despite being fully built with
      // working APIs. Titled "قوالب البريد والمحفّزات" rather than "القوالب" to distinguish it
      // from the communication-campaign templates directly above — it is a different page that
      // owns the email/WhatsApp templates AND the message triggers, including the
      // DONATION_LAPSED reminder.
      { key: "templates", title: "قوالب البريد والمحفّزات", href: "/dashboard/templates", icon: "mail", keywords: ["email", "triggers", "محفزات"] },
      { key: "messages", title: "سجل الرسائل", href: "/dashboard/messages", icon: "history", keywords: ["messages", "log", "history"] },
    ],
  },
  {
    group: "التسويق",
    items: [
      { key: "ads", title: "نظرة عامة على التسويق", href: "/dashboard/marketing", icon: "trendingUp", keywords: ["marketing", "overview"] },
      { key: "ads", title: "أداء الحملات", href: "/dashboard/marketing/performance", icon: "activity", keywords: ["performance", "ads"] },
      { key: "referrals", title: "الروابط والإسناد", href: "/dashboard/marketing/attribution", icon: "link", keywords: ["attribution", "referrals", "links", "utm"] },
      { key: "pixels", title: "التتبع والتحويلات", href: "/dashboard/marketing/tracking", icon: "target", keywords: ["tracking", "pixels", "conversions", "capi"] },
      { key: "ads", title: "التوصيات", href: "/dashboard/marketing/recommendations", icon: "lightbulb", keywords: ["recommendations", "insights"] },
    ],
  },
  {
    group: "ربط المنصات والإرسال",
    items: [
      { key: "platformConnections", title: "نظرة عامة على الربط", href: "/dashboard/platform-connections", icon: "plug", keywords: ["connections", "integrations", "overview"] },
      { key: "platformConnections", title: "بكسلات التتبع", href: "/dashboard/platform-connections/tracking", icon: "radar", keywords: ["pixels", "meta", "tiktok", "snap"] },
      { key: "platformConnections", title: "الحسابات الإعلانية", href: "/dashboard/platform-connections/ad-accounts", icon: "briefcase", keywords: ["ad accounts", "google ads", "meta ads"] },
      { key: "platformConnections", title: "مزودو التواصل والإرسال", href: "/dashboard/platform-connections/communication", icon: "server", keywords: ["providers", "twilio", "smtp", "whatsapp"] },
      { key: "platformConnections", title: "Webhooks", href: "/dashboard/platform-connections/webhooks", icon: "webhook", keywords: ["webhooks", "stripe"] },
      { key: "platformConnections", title: "فحص الاتصال", href: "/dashboard/platform-connections/health", icon: "heartPulse", keywords: ["health", "status", "diagnostics"] },
      { key: "platformConnections", title: "سجلات المنصات", href: "/dashboard/platform-connections/logs", icon: "fileClock", keywords: ["logs", "platform"] },
      // No dedicated "telegram" permission key exists, and inventing one would need a matching
      // grant UI. It is an outbound integration, so it sits under platformConnections with the
      // other providers. Donation notifications depend on this page being configurable.
      { key: "platformConnections", title: "تيليجرام", href: "/dashboard/telegram", icon: "send", keywords: ["telegram", "bot", "notifications"] },
    ],
  },
  {
    group: "الإدارة",
    items: [
      { key: "team", title: "الفريق", href: "/dashboard/users/team", icon: "userCog", keywords: ["team", "staff", "permissions", "صلاحيات"] },
      { key: "generalSettings", title: "الإعدادات", href: "/dashboard/general/payment-gateways", icon: "settings", keywords: ["settings", "payment", "gateways", "stripe"] },
      { key: "logs", title: "سجلات النظام", href: "/dashboard/logs", icon: "scrollText", keywords: ["logs", "audit", "system"] },
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
  { key: "campaigns", group: "الحملات والمحتوى", title: "المشاريع" },
  { key: "categories", group: "الحملات والمحتوى", title: "الحملات والدول" },
  { key: "blog", group: "الحملات والمحتوى", title: "المدونة" },
  // P3-2: these five keys were valid in DASHBOARD_PERMISSION_KEYS and enforced by the API
  // guards, but appeared in NO grant UI — so they could never actually be granted, and a user
  // holding one saw an empty sidebar and got bounced out of the dashboard. Now that their
  // pages are linked in the nav above, they must also be grantable.
  { key: "slides", group: "الحملات والمحتوى", title: "الشرائح" },
  { key: "ticker", group: "الحملات والمحتوى", title: "شريط التبرعات" },
  { key: "badges", group: "الحملات والمحتوى", title: "الشارات" },
  { key: "templates", group: "التشغيل / التواصل", title: "قوالب البريد والمحفّزات" },
  { key: "messages", group: "التشغيل / التواصل", title: "سجل الرسائل" },
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
