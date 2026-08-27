import { prisma } from "@/lib/prisma";
import { orderCampaignsByIds } from "@/lib/blog/campaign-ids";
import { whereByIdOrAnyLocaleSlug } from "@/lib/slug";

/**
 * `locale` is accepted for call-site compatibility but no longer narrows the
 * lookup: every translation is returned and the caller picks. Resolution must
 * stay locale-agnostic or a URL the page rendered can fail to resolve here.
 */
export default async function getPost(postId: string, locale: string = "ar") {
  void locale;
  try {
    // Caller may pass an ID, the base slug, or a per-locale slug. One
    // locale-agnostic clause resolves all three — this used to walk a hardcoded
    // locale list one query at a time, which cost up to eight round-trips and
    // silently missed `de`.
    const post = await prisma.post.findFirst({
      where: whereByIdOrAnyLocaleSlug(postId),
      include: {
        category: true,
        translations: true,
      },
    });

    if (!post) return null;

    const ids = post.campaignIds ?? [];
    const campaignRows =
      ids.length === 0
        ? []
        : await prisma.campaign.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              title: true,
              currentAmount: true,
              targetAmount: true,
              images: true,
              goalType: true,
              fundraisingMode: true,
              sharePriceUSD: true,
              suggestedShareCounts: true,
            },
          });
    const campaigns = orderCampaignsByIds(ids, campaignRows);

    return { ...post, campaigns };
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}
