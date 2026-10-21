import { SUPPORTED_LOCALES } from "../locales";
import { SUPPORTED_CURRENCY_CODES } from "../supported-currencies";
import { safeEditorUrl } from "./urls";
import type { ContentRecord } from "./contracts";

export const CAMPAIGN_CONFIG_KEYS = ["suggestedDonations", "suggestedTeamSupport", "suggestedShareCounts", "shareLabels"];
export const FINANCE_CONFIRMATION = "أؤكد تعديل المبلغ";
export const RELIGIOUS_CONFIRMATION = "أؤكد تعديل النص العربي";
export const SLUG_CONFIRMATION = "أؤكد تغيير الرابط";
const object = (value: unknown): ContentRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("إعدادات متقدمة غير صالحة");
  return value as ContentRecord;
};
function numbers(value: unknown, integer = false, empty = false): number[] {
  if (!Array.isArray(value) || value.length > 12 || (!empty && !value.length) ||
    value.some(n => typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > 1e9 || (integer && !Number.isInteger(n))))
    throw new Error("أدخل من قيمة إلى 12 قيمة موجبة صالحة؛ أعداد الأسهم أعداد صحيحة");
  return [...new Set(value as number[])];
}
export function validateCampaignConfig(key: string, input: unknown): ContentRecord | null {
  if (input === null) return null;
  const value = object(input);
  if (key === "shareLabels") {
    const result: ContentRecord = {};
    for (const [locale, entry] of Object.entries(value)) {
      if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) throw new Error("لغة تسمية الأسهم غير صالحة");
      const row = object(entry);
      if ([row.singular, row.plural].some(v => typeof v !== "string" || v.length > 100)) throw new Error("تسمية السهم يجب ألا تتجاوز 100 حرف");
      const singular = String(row.singular).trim(), plural = String(row.plural).trim();
      if (singular || plural) result[locale] = { singular: singular || plural, plural: plural || singular };
    }
    return Object.keys(result).length ? result : null;
  }
  const shares = key === "suggestedShareCounts";
  const mapKey = shares ? "priceByCurrency" : "byCurrency";
  const overrides = value[mapKey] == null ? {} : object(value[mapKey]);
  if (Object.keys(overrides).length > 20) throw new Error("الحد الأقصى 20 تخصيص عملة");
  const resultMap: ContentRecord = {};
  for (const [currency, entry] of Object.entries(overrides)) {
    if (!SUPPORTED_CURRENCY_CODES.includes(currency)) throw new Error("عملة غير مدعومة");
    if (shares) {
      if (typeof entry !== "number" || !Number.isFinite(entry) || entry <= 0 || entry > 1e9) throw new Error("سعر السهم حسب العملة غير صالح");
      resultMap[currency] = entry;
    } else resultMap[currency] = numbers(entry);
  }
  return { [shares ? "counts" : "amounts"]: numbers(value[shares ? "counts" : "amounts"], shares, key === "suggestedTeamSupport"), [mapKey]: resultMap };
}
export function validateFinancialAdjustment(value: unknown): number {
  const input = object(value);
  if (input.confirmation !== FINANCE_CONFIRMATION || typeof input.desiredTotal !== "number" ||
    !Number.isFinite(input.desiredTotal) || input.desiredTotal < 0 || input.desiredTotal > 1e12)
    throw new Error("تعديل المبلغ يتطلب قيمة صالحة وتأكيدًا صريحًا");
  return input.desiredTotal;
}
export function validateReligiousAdjustment(value: unknown): string {
  const input = object(value);
  if (input.confirmation !== RELIGIOUS_CONFIRMATION || typeof input.text !== "string" || input.text.length > 10000)
    throw new Error("تعديل النص العربي يتطلب تأكيدًا صريحًا");
  return input.text;
}
export function validateSlugAdjustment(value: unknown): string {
  const input = object(value);
  if (input.confirmation !== SLUG_CONFIRMATION || typeof input.slug !== "string" || input.slug.length > 200 || !/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(input.slug)) throw new Error("أدخل رابطًا صالحًا وأكد تغيير الرابط");
  return input.slug;
}
export function validateCampaignUpdates(value: unknown, old: ContentRecord[]): ContentRecord[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error("قائمة الإنجازات غير صالحة");
  const seen = new Set<string>();
  return value.map(raw => {
    const row = object(raw), result: ContentRecord = {};
    if (row.id) {
      if (typeof row.id !== "string" || seen.has(row.id) || !old.some(o => o.id === row.id)) throw new Error("الإنجاز لا ينتمي لهذا المشروع");
      seen.add(row.id); result.id = row.id;
    }
    for (const key of ["title", "description", "image", "videoUrl"]) {
      const text = row[key] ?? "";
      if (typeof text !== "string" || text.length > (key === "description" ? 30000 : key === "title" ? 2000 : 2048)) throw new Error("بيانات إنجاز غير صالحة");
      if (["title", "description"].includes(key) && !text.trim()) throw new Error("عنوان الإنجاز ووصفه بالعربية مطلوبان");
      if (["image", "videoUrl"].includes(key) && text && (!safeEditorUrl(text) || (key === "videoUrl" && !/^https?:\/\//.test(text)))) throw new Error("رابط وسائط الإنجاز غير صالح");
      result[key] = text;
    }
    if (!Array.isArray(row.translations)) throw new Error("ترجمات الإنجاز غير صالحة");
    const locales = new Set<string>();
    result.translations = row.translations.map(rawTranslation => {
      const t = object(rawTranslation), locale = String(t.locale);
      if (locale === "ar" || !(SUPPORTED_LOCALES as readonly string[]).includes(locale) || locales.has(locale)) throw new Error("لغة إنجاز غير صالحة");
      locales.add(locale);
      if ([t.title, t.description].some(v => typeof v !== "string") || String(t.title).length > 2000 || String(t.description).length > 30000) throw new Error("ترجمة إنجاز غير صالحة");
      if (!!String(t.title).trim() !== !!String(t.description).trim()) throw new Error("أكمل عنوان الإنجاز ووصفه في اللغة المختارة");
      return { locale, title: t.title, description: t.description };
    });
    return result;
  });
}
