import { AsyncLocalStorage } from "node:async_hooks";
import CATALOGS from "./report-translations.json";
type ReportLocale = "ar" | "en" | "tr";
const context = new AsyncLocalStorage<ReportLocale>();
let fallbackLocale: ReportLocale = "ar";
/** The fallback is for callers without a request context. Exports should pass language explicitly. */
export function setDashLocale(locale: ReportLocale): void { fallbackLocale = locale; }
function locale(): ReportLocale { return context.getStore() ?? fallbackLocale; }
function keyHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
export function withReportLanguage<T>(language: string | null | undefined, work: () => T): T {
  const selected = language === "ar" || language === "en" || language === "tr" ? language : locale();
  return context.run(selected, work);
}
export function dt(text: string, params?: readonly unknown[]): string {
  const language = locale(), core = text.trim();
  const catalog: Record<string, string> = language === "tr" ? CATALOGS.tr : CATALOGS.en;
  let out = language === "ar" ? text : text.replace(core, catalog[keyHash(core)] ?? core);
  if (params) out = out.replace(/\{(\d+)\}/g, (_, i: string) => String(params[Number(i)] ?? ""));
  return out;
}
export function dashDir(): "rtl" | "ltr" { return locale() === "ar" ? "rtl" : "ltr"; }
export function dashIntl(arabicLocale: string): string { return locale() === "ar" ? arabicLocale : locale() === "en" ? "en-GB" : "tr-TR"; }
