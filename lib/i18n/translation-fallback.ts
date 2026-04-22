// Fallback order for localized records: requested locale → English → base (Arabic).
// Base model fields already hold the Arabic text, so if neither a locale-specific
// translation nor an English translation exists, callers should read the base field.

export function translationLocaleWhere(locale: string): { locale: { in: string[] } } {
  const set = new Set<string>();
  if (locale && locale !== 'ar') set.add(locale);
  set.add('en');
  return { locale: { in: [...set] } };
}

export function pickTranslation<T extends { locale: string }>(
  translations: T[] | undefined | null,
  locale: string
): T | undefined {
  if (!translations?.length) return undefined;
  if (locale && locale !== 'ar') {
    const exact = translations.find(t => t.locale === locale);
    if (exact) return exact;
  }
  return translations.find(t => t.locale === 'en');
}
