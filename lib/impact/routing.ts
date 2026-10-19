import type { ImpactRegion } from "./config";

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
  return `/${locale}/impact/${encodeURIComponent(campaignSlug)}/${encodeURIComponent(impactRegionSlug(region, locale))}`;
}
