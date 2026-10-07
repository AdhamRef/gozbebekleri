import "server-only";
import { prisma } from "@/lib/prisma";

/** Slug of the impact builder linked from the navbar and shown on the homepage. */
export const FEATURED_IMPACT_SLUG = "make-an-impact";

const IMPACT_SELECT = {
  id: true,
  slug: true,
  isActive: true,
  title: true,
  intro: true,
  regions: true,
  needs: true,
  allowMonthly: true,
  campaignId: true,
} as const;

/** An active impact campaign by slug, or null. */
export async function loadImpactCampaign(slug: string) {
  const row = await prisma.impactCampaign.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: IMPACT_SELECT,
  });
  return row?.isActive ? row : null;
}

/** The featured impact campaign, falling back to the newest active one. */
export async function loadFeaturedImpactCampaign() {
  return (
    (await loadImpactCampaign(FEATURED_IMPACT_SLUG)) ??
    (await prisma.impactCampaign.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: IMPACT_SELECT,
    }))
  );
}
