import { isValidLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from "../locales";
import type { SupportedLocale } from "../ported-systems/locales";

/** Compatibility routes use this project's existing public URL structure. */
export function miaPath(page: string, locale: SupportedLocale | string = "ar", slug?: string): string {
  const publicLanguage = isValidLocale(locale) ? locale : (SUPPORTED_LOCALES as readonly string[]).includes("en") ? "en" : DEFAULT_LOCALE;
  const lang = encodeURIComponent(publicLanguage);
  if (page === "projectDetail") return "/" + lang + "/campaign/" + (slug ?? "");
  if (page === "projects") return "/" + lang + "/campaigns";
  if (page === "profile") return "/" + lang + "/profile";
  return "/" + lang + "/" + ({home:"",zakat:"campaigns",waqf:"campaigns",recurring:"campaigns"}[page as "home"] ?? page);
}
export function routeForPathname(pathname: string): string | null {
  if (/^\/[a-z]{2}\/campaign\/[^/]+\/?$/i.test(pathname)) return "projectDetail";
  if (/^\/[a-z]{2}\/(?:campaigns|donate|donations)\/?$/i.test(pathname)) return "projects";
  return null;
}
