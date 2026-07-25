import "server-only";

import { prisma } from "@/lib/prisma";

export async function isMediaUrlReferenced(url: string): Promise<boolean> {
  const [campaign, campaignTranslation, category, slide, post, postTranslation, postCategory, postCategoryTranslation, update, user] =
    await Promise.all([
      prisma.campaign.findFirst({ where: { OR: [{ images: { has: url } }, { videoUrl: url }] }, select: { id: true } }),
      prisma.campaignTranslation.findFirst({ where: { OR: [{ image: url }, { videoUrl: url }] }, select: { id: true } }),
      prisma.category.findFirst({ where: { image: url }, select: { id: true } }),
      prisma.slide.findFirst({ where: { image: url }, select: { id: true } }),
      prisma.post.findFirst({ where: { image: url }, select: { id: true } }),
      prisma.postTranslation.findFirst({ where: { image: url }, select: { id: true } }),
      prisma.postCategory.findFirst({ where: { image: url }, select: { id: true } }),
      prisma.postCategoryTranslation.findFirst({ where: { image: url }, select: { id: true } }),
      prisma.update.findFirst({ where: { OR: [{ image: url }, { videoUrl: url }] }, select: { id: true } }),
      prisma.user.findFirst({ where: { image: url }, select: { id: true } }),
    ]);

  return Boolean(
    campaign ||
      campaignTranslation ||
      category ||
      slide ||
      post ||
      postTranslation ||
      postCategory ||
      postCategoryTranslation ||
      update ||
      user,
  );
}
