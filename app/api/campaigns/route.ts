import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { parseSuggestedDonations, validateSuggestedDonationsBody } from "@/lib/campaign/suggested-donations";
import {
  computeCampaignProgressPercent,
  normalizeFundraisingMode,
  normalizeGoalType,
  parseSuggestedShareCounts,
  showCampaignProgress,
  validateSuggestedShareCountsBody,
  FUNDRAISING_SHARES,
  GOAL_TYPE_OPEN,
} from "@/lib/campaign/campaign-modes";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { parseIncludeInactive } from "@/lib/campaign/include-inactive-query";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";
import { generateUniqueSlug, normalizeUserSlug } from "@/lib/slug";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Number(searchParams.get('limit')) || 10000;
    const locale = searchParams.get('locale') || 'ar'; // Default to Arabic
    
    // Filter parameters
    const search = searchParams.get('search')?.toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'newest';
    const minAmount = Number(searchParams.get('minAmount')) || 0;
    const maxAmount = Number(searchParams.get('maxAmount')) || Infinity;
    const includeInactive = parseIncludeInactive(searchParams);
    const hasPriority = searchParams.get('hasPriority') === 'true';

    // Build where clause for main fields
    const where: any = {
      AND: [
        // Amount range
        { targetAmount: { gte: minAmount } },
        maxAmount < Infinity ? { targetAmount: { lte: maxAmount } } : {},
        // Default: active campaigns only; isActiveFalse=true includes inactive
        includeInactive ? {} : { isActive: true },
        // Priority filter
        hasPriority ? { NOT: { priority: null } } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Build orderBy based on sortBy parameter
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'amount-high':
        orderBy = { currentAmount: 'desc' };
        break;
      case 'amount-low':
        orderBy = { currentAmount: 'asc' };
        break;
      case 'progress':
        orderBy = { currentAmount: 'desc' };
        break;
      case 'priority':
        // Fetch newest first; in-memory sort puts prioritized campaigns first (nulls last)
        orderBy = { createdAt: 'desc' };
        break;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy,
      include: {
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
            translations: {
              where: translationLocaleWhere(locale),
              take: 2,
            },
          },
        },
        translations: {
          where: translationLocaleWhere(locale),
          take: 2,
        },
        _count: {
          select: { donations: true }
        }
      },
    });

    // Filter by search term if provided (search in both base and translated fields)
    let filteredCampaigns = campaigns;
    if (search) {
      filteredCampaigns = campaigns.filter(campaign => {
        const t = pickTranslation(campaign.translations, locale);
        const title = t?.title || campaign.title;
        const description = t?.description || campaign.description;

        return (
          title?.toLowerCase().includes(search) ||
          description?.toLowerCase().includes(search)
        );
      });
    }

    // Handle in-memory sorting
    let sortedCampaigns = [...filteredCampaigns];
    if (sortBy === 'progress') {
      sortedCampaigns.sort((a, b) => {
        const ga = normalizeGoalType(a.goalType);
        const gb = normalizeGoalType(b.goalType);
        const progressA = computeCampaignProgressPercent(a.currentAmount, a.targetAmount, ga) / 100;
        const progressB = computeCampaignProgressPercent(b.currentAmount, b.targetAmount, gb) / 100;
        return progressB - progressA;
      });
    } else if (sortBy === 'priority') {
      // Prioritized campaigns (priority not null) come first, sorted ascending by priority value.
      // Campaigns without a priority are sorted by createdAt desc after the prioritized ones.
      sortedCampaigns.sort((a, b) => {
        const ap = a.priority ?? null;
        const bp = b.priority ?? null;
        if (ap !== null && bp !== null) return ap - bp;
        if (ap !== null) return -1;
        if (bp !== null) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const hasMore = sortedCampaigns.length > limit;
    const items = hasMore ? sortedCampaigns.slice(0, -1) : sortedCampaigns;
    const nextCursor = hasMore ? sortedCampaigns[sortedCampaigns.length - 2].id : null;

    const transformedCampaigns = items.map((campaign) => {
      const goalType = normalizeGoalType(campaign.goalType);
      const fundraisingMode = normalizeFundraisingMode(campaign.fundraisingMode);
      const tC = pickTranslation(campaign.translations, locale);
      const tCat = pickTranslation(campaign.category?.translations, locale);
      return {
        id: campaign.id,
        slug: campaign.slug ?? null,
        title: tC?.title || campaign.title,
        description: tC?.description || campaign.description,
        images: campaign.images,
        videoUrl: campaign.videoUrl,
        targetAmount: campaign.targetAmount,
        currentAmount: campaign.currentAmount,
        isActive: campaign.isActive,
        priority: campaign.priority,
        category: campaign.category
          ? {
              id: campaign.category.id,
              slug: campaign.category.slug ?? null,
              name: tCat?.name || campaign.category.name,
              icon: campaign.category.icon,
            }
          : null,
        donationCount: campaign._count.donations,
        progress: computeCampaignProgressPercent(
          campaign.currentAmount,
          campaign.targetAmount,
          goalType
        ),
        showProgress: showCampaignProgress(goalType),
        goalType,
        fundraisingMode,
        sharePriceUSD: campaign.sharePriceUSD ?? null,
        suggestedShareCounts: parseSuggestedShareCounts(campaign.suggestedShareCounts),
        suggestedDonations: parseSuggestedDonations(campaign.suggestedDonations),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      };
    });

    return NextResponse.json({
      items: transformedCampaigns,
      nextCursor,
      hasMore,
      filters: {
        search,
        sortBy,
        minAmount,
        maxAmount,
        includeInactive,
        hasPriority,
        locale
      }
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ STEP 1: Authentication check
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    const data = await request.json();

    const goalType = normalizeGoalType(data.goalType);
    const fundraisingMode = normalizeFundraisingMode(data.fundraisingMode);

    let targetAmount = Number(data.targetAmount);
    if (goalType === GOAL_TYPE_OPEN) {
      targetAmount = 0;
    } else if (!Number.isFinite(targetAmount) || targetAmount < 1) {
      return NextResponse.json(
        { error: "For fixed-goal campaigns, targetAmount must be at least 1" },
        { status: 400 }
      );
    }

    if (!data.title || !data.description || !data.categoryId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, categoryId" },
        { status: 400 }
      );
    }

    if (fundraisingMode === FUNDRAISING_SHARES) {
      const sp = Number(data.sharePriceUSD);
      if (!Number.isFinite(sp) || sp <= 0) {
        return NextResponse.json(
          { error: "sharePriceUSD is required and must be positive for share-based (سهوم) campaigns" },
          { status: 400 }
        );
      }
    }

    if (!data.images || data.images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    let suggestedDonations: Prisma.InputJsonValue | undefined;
    if (data.suggestedDonations !== undefined) {
      try {
        const v = validateSuggestedDonationsBody(data.suggestedDonations);
        if (v) suggestedDonations = v as unknown as Prisma.InputJsonValue;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid suggestedDonations";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    let suggestedShareCounts: Prisma.InputJsonValue | undefined;
    if (data.suggestedShareCounts !== undefined) {
      try {
        const v = validateSuggestedShareCountsBody(data.suggestedShareCounts);
        if (v) suggestedShareCounts = v as unknown as Prisma.InputJsonValue;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid suggestedShareCounts";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // ✅ STEP 3: Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    // ✅ STEP 4: Prepare translation data
    // English is required — title and description must both be provided.
    const enTrans = data?.translations?.en;
    const enTitle: string | undefined = typeof enTrans?.title === "string" ? enTrans.title.trim() : undefined;
    const enDescription: string | undefined =
      typeof enTrans?.description === "string" ? enTrans.description.trim() : undefined;

    if (!enTitle || !enDescription) {
      return NextResponse.json(
        { error: "English title and description are required" },
        { status: 400 }
      );
    }

    const translationData: { locale: string; title: string; description: string }[] = [];

    if (data.translations && typeof data.translations === 'object') {
      for (const [locale, trans] of Object.entries(data.translations)) {
        if (locale !== 'ar' && trans && typeof trans === 'object') {
          const t = trans as any;
          // Only add translation if BOTH title and description are provided
          if (t.title && t.description) {
            translationData.push({
              locale,
              title: t.title,
              description: t.description,
            });
          }
        }
      }
    }

    // Resolve slug: explicit override or auto-generate from English title (always)
    const requestedSlug = normalizeUserSlug(data.slug);
    const slug = await generateUniqueSlug(
      prisma.campaign as any,
      requestedSlug ?? enTitle,
      { fallbackPrefix: "campaign" }
    );

    // ✅ STEP 5: Create campaign with translations in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      // Create main campaign (Arabic)
      const sharePriceUSD =
        fundraisingMode === FUNDRAISING_SHARES ? Number(data.sharePriceUSD) : null;

      const newCampaign = await tx.campaign.create({
        data: {
          title: data.title,
          description: data.description,
          slug,
          targetAmount,
          currentAmount: 0,
          categoryId: data.categoryId,
          isActive: data.isActive ?? true,
          images: data.images,
          videoUrl: data.videoUrl || null,
          priority: data.priority || null,
          goalType,
          fundraisingMode,
          sharePriceUSD: Number.isFinite(sharePriceUSD) && sharePriceUSD > 0 ? sharePriceUSD : null,
          ...(suggestedDonations !== undefined ? { suggestedDonations } : {}),
          ...(suggestedShareCounts !== undefined
            ? { suggestedShareCounts }
            : {}),
        },
      });

      // Create translations if provided
      if (translationData.length > 0) {
        await tx.campaignTranslation.createMany({
          data: translationData.map((t) => ({
            campaignId: newCampaign.id,
            locale: t.locale,
            title: t.title,
            description: t.description,
          })),
        });
      }

      return newCampaign;
    });

    // ✅ STEP 6: Fetch created campaign with all translations
    const fullCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        targetAmount: true,
        currentAmount: true,
        images: true,
        videoUrl: true,
        isActive: true,
        priority: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        suggestedDonations: true,
        goalType: true,
        fundraisingMode: true,
        sharePriceUSD: true,
        suggestedShareCounts: true,
        translations: {
          select: {
            locale: true,
            title: true,
            description: true,
          },
        },
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    const actor = session!.user;
    await writeAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role ?? "ADMIN",
      action: "CAMPAIGN_CREATE",
      messageAr: `${actor.name ?? "مسؤول"} أنشأ مشروع جديدة: ${fullCampaign?.title ?? data.title}`,
      messageEn: `${actor.name ?? "Admin"} created campaign ${fullCampaign?.title ?? data.title}`,
      entityType: "Campaign",
      entityId: campaign.id,
      metadata: { title: fullCampaign?.title ?? data.title },
    });

    return NextResponse.json(fullCampaign, { status: 201 });
    
  } catch (error) {
    console.error("Error creating campaign:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return NextResponse.json(
          { error: "Invalid category ID" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}