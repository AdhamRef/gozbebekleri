import type { Locale } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { enUS } from "date-fns/locale/en-US";
import { fr } from "date-fns/locale/fr";
import { tr } from "date-fns/locale/tr";
import { de } from "date-fns/locale/de";
import { es } from "date-fns/locale/es";
import { pt } from "date-fns/locale/pt";
import { id } from "date-fns/locale/id";
import type { SupportedLocale } from "./locales";

const DATE_LOCALES: Record<SupportedLocale, Locale> = { ar, en: enUS, fr, tr, de, es, pt, id };

export function publicDateLocale(locale: string): Locale {
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return DATE_LOCALES[language as SupportedLocale] ?? enUS;
}
