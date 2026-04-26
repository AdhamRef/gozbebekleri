import { prisma } from "@/lib/prisma";
import { orderCampaignsByIds } from "@/lib/blog/campaign-ids";
import { whereByIdOrSlug } from "@/lib/slug";

export default async function getPost(postId: string) {
  try {
    const post = await prisma.post.findFirst({
      where: whereByIdOrSlug(postId),
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
