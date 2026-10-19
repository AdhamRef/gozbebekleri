import type { ImpactRegion } from "./config";
import type { SupportedLocale } from "../locales";

export const FEATURED_IMPACT_SLUG = "make-an-impact";

export const IMPACT_CAMPAIGN_SLUGS: Record<SupportedLocale, string> = {
  ar: "اصنع-أثرا",
  en: FEATURED_IMPACT_SLUG,
  tr: "iz-bırak",
  fr: "faites-la-différence",
  de: "wirkung-erzielen",
  es: "deja-tu-huella",
  pt: "faça-a-diferença",
  id: "buat-dampak",
};

/** Public translations are aliases for the existing database slug. */
export function resolveImpactCampaignSlug(slug: string): string {
  const value = decoded(slug);
  if (Object.values(IMPACT_CAMPAIGN_SLUGS).includes(value)) return FEATURED_IMPACT_SLUG;
  try { return decodeURIComponent(slug); }
  catch { return ""; }
}

export function impactCampaignSlug(slug: string, locale: string): string {
  return resolveImpactCampaignSlug(slug) === FEATURED_IMPACT_SLUG
    ? IMPACT_CAMPAIGN_SLUGS[locale as SupportedLocale] ?? FEATURED_IMPACT_SLUG
    : slug;
}

export function impactCampaignPath(locale: string, slug: string): string {
  return `/${locale}/impact/${encodeURIComponent(impactCampaignSlug(slug, locale))}`;
}

/** Next may expose an escaped route param. Compare decoded NFC text so a
 * canonical Unicode URL never redirects back to its own escaped spelling. */
export function impactSlugMatches(actual: string, canonical: string): boolean {
  try { return decodeURIComponent(actual).normalize("NFC") === canonical.normalize("NFC"); }
  catch { return false; }
}

// Stable public slugs, independent of editable display names and internal keys.
const REGION_SLUGS: Record<string, Record<string, string>> = {
  ar: { gaza: "غزة", quds: "القدس", sudan: "السودان", yemen: "اليمن", syria: "سوريا" },
  en: { gaza: "gaza", quds: "jerusalem", sudan: "sudan", yemen: "yemen", syria: "syria" },
  tr: { gaza: "gazze", quds: "kudüs", sudan: "sudan", yemen: "yemen", syria: "suriye" },
  fr: { gaza: "gaza", quds: "jérusalem", sudan: "soudan", yemen: "yémen", syria: "syrie" },
  de: { gaza: "gaza", quds: "jerusalem", sudan: "sudan", yemen: "jemen", syria: "syrien" },
  es: { gaza: "gaza", quds: "jerusalén", sudan: "sudán", yemen: "yemen", syria: "siria" },
  pt: { gaza: "gaza", quds: "jerusalém", sudan: "sudão", yemen: "iêmen", syria: "síria" },
  id: { gaza: "gaza", quds: "yerusalem", sudan: "sudan", yemen: "yaman", syria: "suriah" },
};

function decoded(value: string): string {
  try { return decodeURIComponent(value).normalize("NFC").toLowerCase(); }
  catch { return ""; }
}

export function impactRegionSlug(region: ImpactRegion, locale: string): string {
  return REGION_SLUGS[locale]?.[region.key]
    ?? ((region.name[locale] || region.key).normalize("NFC").toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || region.key);
}

/** Accept canonical translations and legacy/internal keys, but never disabled regions. */
export function resolveImpactRegion(regions: ImpactRegion[], slug: string): ImpactRegion | undefined {
  const value = decoded(slug);
  if (!value) return undefined;
  return regions.find((region) => region.active && (
    region.key === value || Object.keys(REGION_SLUGS).some((locale) => impactRegionSlug(region, locale) === value)
  ));
}

export function impactRegionPath(locale: string, campaignSlug: string, region: ImpactRegion): string {
  return `${impactCampaignPath(locale, campaignSlug)}/${encodeURIComponent(impactRegionSlug(region, locale))}`;
}
