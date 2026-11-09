import { generateImpactMetadata, renderImpactPage, type ImpactPageProps } from "../_components/ImpactCampaignPage";

export const dynamic = "force-dynamic";
export const generateMetadata = generateImpactMetadata;

export default async function LegacyImpactPage(props: ImpactPageProps) {
  return renderImpactPage(props, true);
}
