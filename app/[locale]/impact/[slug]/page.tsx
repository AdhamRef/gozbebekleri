import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildHreflang } from "@/lib/seo";
import { pickText, readImpactConfig } from "@/lib/impact/config";
import { loadImpactCampaign } from "@/lib/impact/load";
import ImpactBuilder from "../_components/ImpactBuilder";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const row = await loadImpactCampaign(slug).catch(() => null);
  if (!row) return { robots: { index: false, follow: true } };
  const title = pickText(row.title, locale);
  const description = pickText(row.intro, locale) || undefined;
  return {
    title,
    description,
    alternates: buildHreflang(`/impact/${row.slug}`, locale),
    openGraph: { title, description },
  };
}

export default async function ImpactPage({ params }: Props) {
  const { slug, locale } = await params;
  const row = await loadImpactCampaign(slug);
  if (!row) notFound();

  const config = readImpactConfig(row);
  return (
    <ImpactBuilder
      impactCampaignId={row.id}
      campaignId={row.campaignId}
      title={pickText(row.title, locale)}
      intro={pickText(row.intro, locale)}
      regions={config.regions}
      needs={config.needs.filter((n) => n.active)}
      allowMonthly={row.allowMonthly}
    />
  );
}
