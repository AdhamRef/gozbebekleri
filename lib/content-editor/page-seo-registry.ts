/**
 * Public pages whose search/share metadata can be managed from the dashboard (SEO pages, GA4 links).
 * Gozbebekleri's own public pages: Minber's registry listed its own site (zakat, waqf, Al-Aqsa, courses,
 * reports, video pages, bank accounts, …), which does not exist here. Gozbebekleri uses the same path in
 * every language, so each entry carries its path directly. Default title keys are left empty: staff set the
 * search title, description and share image per language in the dashboard.
 */
type ManagedSeoPageEntry = {
  key: string;
  label: string;
  path: string;
  route: string | null;
  namespace: string;
  titleKeys: readonly string[];
  descriptionKey: string;
  seoTitle: string;
};
const page = (key: string, label: string, path: string): ManagedSeoPageEntry => ({ key, label, path, route: path ? key : null, namespace: "", titleKeys: [], descriptionKey: "", seoTitle: "" });
export const MANAGED_SEO_PAGES = [
  page("home", "الصفحة الرئيسية", ""),
  page("campaigns", "المشاريع", "/campaigns"),
  page("blog", "المدونة", "/blog"),
  page("aboutUs", "من نحن", "/about-us"),
  page("contactUs", "اتصل بنا", "/contact-us"),
  page("impact", "اصنع أثرًا لطفل", "/impact"),
  page("privacy", "سياسة الخصوصية", "/privacy"),
  page("terms", "الشروط والأحكام", "/terms"),
  page("bankTransfer", "التحويل البنكي", "/bank-transfer"),
] as const;
export function managedSeoPage(key: string) { return MANAGED_SEO_PAGES.find((entry) => entry.key === key); }
export function managedPagePath(key: string, locale: string) {
  void locale; // Gozbebekleri uses the same path in every language
  return managedSeoPage(key)?.path ?? "";
}
export const PAGE_SEO_FIELDS = [
  ["metaTitle", "عنوان البحث"], ["metaDescription", "وصف البحث"], ["seoKeyword", "العبارة الرئيسية المستهدفة"],
  ["ogTitle", "عنوان المشاركة"], ["ogDescription", "وصف المشاركة"], ["ogImage", "صورة المشاركة"], ["imageAlt", "وصف الصورة"],
] as const;
export type PageSeoValues = Record<string, string>;
export type PageSeoLocales = Record<string, PageSeoValues>;
