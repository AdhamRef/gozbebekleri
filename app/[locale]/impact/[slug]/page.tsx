import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SITE_URL, LOCALES } from "@/lib/seo";
import { impactCampaignPath, impactCampaignSlug, impactRegionPath, impactRegionSlug, impactSlugMatches, resolveImpactRegion } from "@/lib/impact/routing";
import { pickText, readImpactConfig } from "@/lib/impact/config";
import { loadImpactCampaign } from "@/lib/impact/load";
import ImpactBuilder from "../_components/ImpactBuilder";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; locale: string; region?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale, region: regionSlug } = await params;
  const row = await loadImpactCampaign(slug).catch(() => null);
  if (!row) return { robots: { index: false, follow: true } };
  const config = readImpactConfig(row);
  const region = regionSlug ? resolveImpactRegion(config.regions, regionSlug) : undefined;
  if (regionSlug && !region) return { robots: { index: false, follow: true } };
  const title = [pickText(row.title, locale), region && pickText(region.name, locale)].filter(Boolean).join(" | ");
  const pathForLocale = (lang: string) => region
    ? impactRegionPath(lang, row.slug, region)
    : impactCampaignPath(lang, row.slug);
  const alternates = {
    canonical: SITE_URL + pathForLocale(locale),
    languages: Object.fromEntries([
      ...LOCALES.map((lang) => [lang, SITE_URL + pathForLocale(lang)]),
      ["x-default", SITE_URL + pathForLocale("ar")],
    ]),
  };
  const description = pickText(row.intro, locale) || undefined;
  return {
    title,
    description,
    alternates,
    openGraph: { title, description },
  };
}

export default async function ImpactPage({ params, searchParams }: Props) {
  const { slug, locale, region: regionSlug } = await params;
  const row = await loadImpactCampaign(slug);
  if (!row) notFound();

  const config = readImpactConfig(row);
  const region = regionSlug ? resolveImpactRegion(config.regions, regionSlug) : undefined;
  if (regionSlug && !region) notFound();
  // Old English URLs and cross-language aliases remain valid entry points.
  if (!impactSlugMatches(slug, impactCampaignSlug(row.slug, locale))
    || (region && !impactSlugMatches(regionSlug!, impactRegionSlug(region, locale)))) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value !== undefined) query.append(key, value);
    }
    const path = region ? impactRegionPath(locale, row.slug, region) : impactCampaignPath(locale, row.slug);
    redirect(path + (query.size ? `?${query}` : ""));
  }
  return (
    <ImpactBuilder
      impactCampaignId={row.id}
      campaignId={row.campaignId}
      campaignSlug={row.slug}
      initialRegionKey={region?.key}
      title={pickText(row.title, locale)}
      intro={pickText(row.intro, locale)}
      regions={config.regions}
      needs={config.needs.filter((n) => n.active)}
      allowMonthly={row.allowMonthly}
    />
  );
}
