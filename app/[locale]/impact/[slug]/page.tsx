import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildHreflang, SITE_URL, LOCALES } from "@/lib/seo";
import { impactRegionPath, resolveImpactRegion } from "@/lib/impact/routing";
import { pickText, readImpactConfig } from "@/lib/impact/config";
import { loadImpactCampaign } from "@/lib/impact/load";
import ImpactBuilder from "../_components/ImpactBuilder";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; locale: string; region?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale, region: regionSlug } = await params;
  const row = await loadImpactCampaign(slug).catch(() => null);
  if (!row) return { robots: { index: false, follow: true } };
  const config = readImpactConfig(row);
  const region = regionSlug ? resolveImpactRegion(config.regions, regionSlug) : undefined;
  if (regionSlug && !region) return { robots: { index: false, follow: true } };
  const title = [pickText(row.title, locale), region && pickText(region.name, locale)].filter(Boolean).join(" | ");
  const alternates = region ? {
    canonical: SITE_URL + impactRegionPath(locale, row.slug, region),
    languages: Object.fromEntries([
      ...LOCALES.map((lang) => [lang, SITE_URL + impactRegionPath(lang, row.slug, region)]),
      ["x-default", SITE_URL + impactRegionPath("ar", row.slug, region)],
    ]),
  } : buildHreflang(`/impact/${row.slug}`, locale);
  const description = pickText(row.intro, locale) || undefined;
  return {
    title,
    description,
    alternates,
    openGraph: { title, description },
  };
}

export default async function ImpactPage({ params }: Props) {
  const { slug, locale, region: regionSlug } = await params;
  const row = await loadImpactCampaign(slug);
  if (!row) notFound();

  const config = readImpactConfig(row);
  const region = regionSlug ? resolveImpactRegion(config.regions, regionSlug) : undefined;
  if (regionSlug && !region) notFound();
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
