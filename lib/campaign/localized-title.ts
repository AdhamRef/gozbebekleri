import { isValidLocale, type SupportedLocale } from "../locales";
export const TRANSLATION_UNAVAILABLE: Record<SupportedLocale, string> = {
  ar: "الترجمة غير متاحة؛ يُعرض العنوان بلغة أخرى",
  en: "Translation unavailable; title shown in another language",
  fr: "Traduction indisponible ; titre affiché dans une autre langue",
  tr: "Çeviri mevcut değil; başlık başka bir dilde gösteriliyor",
  id: "Terjemahan belum tersedia; judul ditampilkan dalam bahasa lain",
  pt: "Tradução indisponível; título apresentado noutro idioma",
  es: "Traducción no disponible; título mostrado en otro idioma",
  de: "Übersetzung nicht verfügbar; Titel wird in einer anderen Sprache angezeigt",
};
/** Resolve the title and its real language together, on initial SSR and subsequent API reads. */
export function localizedCampaignTitle(base: string, translations: readonly { locale: string; title?: string | null }[], requested: string) {
  const locale = isValidLocale(requested) ? requested : "ar";
  if (locale === "ar") return { title: base, titleLocale: "ar", translationMissing: false };
  const translation = translations.find(t => t.locale === locale && t.title?.trim())
    ?? translations.find(t => t.locale === "en" && t.title?.trim());
  const titleLocale = translation?.locale ?? "ar";
  return { title: translation?.title || base, titleLocale, translationMissing: titleLocale !== locale };
}
