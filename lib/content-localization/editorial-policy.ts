export const EDITORIAL_ACTIONS = ["proofread", "improve", "format", "content-seo", "review-translation"] as const;
export type EditorialAction = typeof EDITORIAL_ACTIONS[number];
export const EDITORIAL_LABELS: Record<EditorialAction, string> = {
  proofread: "تدقيق العربية", improve: "تحسين المحتوى", format: "تنسيق المحتوى", "content-seo": "تحسين المحتوى لـ SEO", "review-translation": "مراجعة الترجمة",
};
const terms: Record<string, string> = {
  ar: "القدس؛ المسجد الأقصى؛ الزكاة؛ الوقف. فصحى واضحة وسليمة، بلا مبالغة أو تعبيرات ركيكة.",
  en: "القدس = Jerusalem; المسجد الأقصى = Al-Aqsa Mosque; الزكاة = Zakat; الوقف = Waqf. Natural, clear English for charitable giving audiences; avoid literal Arabic syntax.",
  tr: "القدس = Kudüs; المسجد الأقصى = Mescid-i Aksa; الزكاة = zekât; الوقف = vakıf. Native Turkish charitable language; natural sentence order and a respectful bağış call to action.",
  fr: "القدس = Jérusalem; المسجد الأقصى = mosquée Al-Aqsa; الزكاة = zakat; الوقف = waqf. Natural French for humanitarian donors, respectful and precise.",
  de: "القدس = Jerusalem; المسجد الأقصى = Al-Aqsa-Moschee; الزكاة = Zakat; الوقف = Waqf. Clear idiomatic German for humanitarian donors.",
  es: "القدس = Jerusalén; المسجد الأقصى = mezquita de Al-Aqsa; الزكاة = zakat; الوقف = waqf. Natural Spanish for humanitarian donors.",
  pt: "القدس = Jerusalém; المسجد الأقصى = Mesquita de Al-Aqsa; الزكاة = zakat; الوقف = waqf. Natural Portuguese for humanitarian donors.",
  id: "القدس = Yerusalem; المسجد الأقصى = Masjid Al-Aqsa; الزكاة = zakat; الوقف = wakaf. Natural Indonesian for humanitarian donors.",
};
export function editorialLanguagePolicy(locale: string) {
  return ["Arabic is the sole source of facts and meaning. Never translate through an intermediate language.",
    "Institution brand: Gözbebekleri / قرة العيون. Preserve registered legal names and official identifiers. Do not invent an institution, beneficiary, location, cost, result, guarantee, urgency or religious quotation.",
    "Adapt register, terminology, sentence flow and call to action to the target language's audience while preserving the Arabic meaning. Apply glossary terms only where present in the source. Do not invent market research or search-volume claims.", terms[locale] || "Use professional native language appropriate for humanitarian donors."].join("\n");
}
