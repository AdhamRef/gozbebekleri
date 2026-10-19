import { notFound } from "next/navigation";
import { FEATURED_IMPACT_SLUG, resolveImpactCampaignSlug } from "@/lib/impact/routing";
import { generateImpactMetadata, renderImpactPage } from "../impact/_components/ImpactCampaignPage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; impactSlug: string; region?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function adaptProps(props: Props) {
  const { impactSlug, ...params } = await props.params;
  // Only the known featured builder aliases belong to this route. Existing
  // static pages always take precedence and arbitrary paths remain 404s.
  if (resolveImpactCampaignSlug(impactSlug) !== FEATURED_IMPACT_SLUG) notFound();
  return { params: Promise.resolve({ ...params, slug: impactSlug }), searchParams: props.searchParams };
}

export async function generateMetadata(props: Props) {
  return generateImpactMetadata(await adaptProps(props));
}

export default async function CleanImpactPage(props: Props) {
  return renderImpactPage(await adaptProps(props));
}
