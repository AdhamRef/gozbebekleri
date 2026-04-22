import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { orderCampaignsByIds, sanitizeCampaignIds } from "@/lib/blog/campaign-ids";
import {
  computeCampaignProgressPercent,
  normalizeFundraisingMode,
  normalizeGoalType,
  parseSuggestedShareCounts,
  showCampaignProgress,
} from "@/lib/campaign/campaign-modes";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const url = new URL(req.url);
    const qp = url.searchParams;
    const locale = req.headers.get('x-locale') || qp.get('locale') || qp.get('lang') || 'ar';

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        image: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            translations: { where: translationLocaleWhere(locale), take: 2, select: { locale: true, name: true } }
          }
        },
        campaignIds: true,
        translations: { where: translationLocaleWhere(locale), take: 2, select: { title: true, description: true, content: true, image: true, locale: true } }
      }
    });

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const campaignIdList = post.campaignIds ?? [];
    const campaignRows =
      campaignIdList.length === 0
        ? []
        : await prisma.campaign.findMany({
            where: { id: { in: campaignIdList } },
            select: {
              id: true,
              title: true,
              description: true,
              targetAmount: true,
              currentAmount: true,
              images: true,
              isActive: true,
              goalType: true,
              fundraisingMode: true,
              sharePriceUSD: true,
              suggestedShareCounts: true,
              translations: { where: translationLocaleWhere(locale), take: 2, select: { locale: true, title: true, description: true } },
            },
          });
    const orderedCampaigns = orderCampaignsByIds(campaignIdList, campaignRows).map((c) => {
      const goalType = normalizeGoalType(c.goalType);
      const tC = pickTranslation(c.translations, locale);
      return {
        id: c.id,
        title: tC?.title || c.title,
        description: tC?.description || c.description,
        targetAmount: c.targetAmount,
        currentAmount: c.currentAmount,
        images: c.images,
        isActive: c.isActive,
        goalType,
        fundraisingMode: normalizeFundraisingMode(c.fundraisingMode),
        sharePriceUSD: c.sharePriceUSD ?? null,
        suggestedShareCounts: parseSuggestedShareCounts(c.suggestedShareCounts),
        showProgress: showCampaignProgress(goalType),
        progress: computeCampaignProgressPercent(
          c.currentAmount,
          c.targetAmount,
          goalType
        ),
      };
    });

    // Find similar posts in the same category (only published)
    let similar = await prisma.post.findMany({
      where: { categoryId: post.category?.id, id: { not: postId }, published: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        image: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        translations: { where: translationLocaleWhere(locale), take: 2, select: { locale: true, title: true, description: true, content: true, image: true } }
      }
    });

    // If no similar posts in the category, fall back to latest published posts (excluding current)
    if (!similar || similar.length === 0) {
      similar = await prisma.post.findMany({
        where: { published: true, id: { not: postId } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          image: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          translations: { where: translationLocaleWhere(locale), take: 2, select: { locale: true, title: true, description: true, content: true, image: true } }
        }
      });
    }

    const tPost = pickTranslation(post.translations, locale);
    const tPostCat = pickTranslation(post.category?.translations, locale);

    const filteredPost = {
      id: post.id,
      title: tPost?.title || post.title,
      description: tPost?.description || post.description,
      content: tPost?.content || post.content,
      image: tPost?.image || post.image,
      published: post.published,
      category: post.category ? { id: post.category.id, name: tPostCat?.name || post.category.name } : null,
      campaigns: orderedCampaigns,
      /** @deprecated use campaigns[0] */
      campaign: orderedCampaigns[0] ?? null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    const filteredSimilar = similar.map(sp => {
      const tSp = pickTranslation(sp.translations, locale);
      return {
        id: sp.id,
        title: tSp?.title || sp.title,
        description: tSp?.description || sp.description,
        content: tSp?.content || sp.content,
        image: tSp?.image || sp.image,
        published: sp.published,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      };
    });

    return NextResponse.json({ post: filteredPost, similarPosts: filteredSimilar });
  } catch (error) {
    console.error('[POST_GET]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

// PATCH: update post main fields and upsert translations
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "blog");
    if (denied) return denied;

    const { postId } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.published !== undefined) updateData.published = body.published;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.campaignIds !== undefined) {
      updateData.campaignIds = sanitizeCampaignIds(body.campaignIds);
    } else if (body.campaignId !== undefined) {
      updateData.campaignIds = sanitizeCampaignIds(
        body.campaignId === "" || body.campaignId == null ? [] : [body.campaignId]
      );
    }

    const translationUpdates: { locale: string; data: any }[] = [];
    if (body.translations && typeof body.translations === 'object') {
      for (const [locale, t] of Object.entries(body.translations)) {
        if (locale !== 'ar' && t && typeof t === 'object') {
          translationUpdates.push({ locale, data: t as any });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const post = await tx.post.update({ where: { id: postId }, data: updateData });

      for (const { locale, data } of translationUpdates) {
        const td: any = {};
        if (data.title !== undefined) td.title = data.title;
        if (data.description !== undefined) td.description = data.description;
        if (data.content !== undefined) td.content = data.content;
        if (data.image !== undefined) td.image = data.image;
        if (Object.keys(td).length === 0) continue;

        await tx.postTranslation.upsert({
          where: { postId_locale: { postId, locale } },
          update: td,
          create: { postId, locale, ...td }
        });
      }

      return post;
    });

    const full = await prisma.post.findUnique({
      where: { id: updated.id },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        image: true,
        published: true,
        categoryId: true,
        campaignIds: true,
        translations: { select: { locale: true, title: true, description: true, content: true, image: true } },
      },
    });

    const actor = session!.user;
    await writeAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role ?? "ADMIN",
      action: "POST_UPDATE",
      messageAr: `${actor.name ?? "مسؤول"} عدّل مقالًا: ${full?.title ?? body.title ?? postId}`,
      entityType: "Post",
      entityId: postId,
    });

    return NextResponse.json(full);
  } catch (error) {
    console.error('[POST_UPDATE]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

// DELETE: admin-only delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "blog");
    if (denied) return denied;

    const { postId } = await params;

    const exists = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true },
    });
    if (!exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.postTranslation.deleteMany({ where: { postId } });
      await tx.post.delete({ where: { id: postId } });
    });

    const actor = session!.user;
    await writeAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role ?? "ADMIN",
      action: "POST_DELETE",
      messageAr: `${actor.name ?? "مسؤول"} حذف مقالًا: ${exists.title}`,
      entityType: "Post",
      entityId: postId,
    });

    return NextResponse.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('[POST_DELETE]', error);
    return NextResponse.json({ error: 'Error deleting post' }, { status: 500 });
  }
}