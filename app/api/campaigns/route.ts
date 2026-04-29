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
import {
  generateUniqueSlug,
  generateUniqueLocaleSlug,
  normalizeUserSlug,
} from "@/lib/slug";

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

    // Build orderBy based on sortBy parameter.
    // Default ("newest") applies global priority first (asc, nulls last) then createdAt desc,
    // so admin-set priority surfaces without the client opting in. Explicit user-picked
    // sorts (amount-high/-low, progress) override priority entirely.
    // Mongo's ascending sort places null FIRST, so a single `[priority asc, createdAt desc]`
    // query would mostly return unprioritized rows in the page slice. Instead, when priority
    // ordering is in effect on the first page (no cursor), we fan out into two queries —
    // prioritized first, then non-prioritized recency — and merge.
    let orderBy: any = { createdAt: 'desc' };
    const applyPriorityFallbackSort = sortBy === 'newest' || !sortBy || sortBy === 'priority';
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
    }

    const includeShape = {
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
        select: { donations: true },
      },
    } satisfies Prisma.CampaignInclude;

    const campaigns = await (async () => {
      if (applyPriorityFallbackSort && !cursor) {
        // First page with priority-aware default ordering: split into two queries.
        // 1) prioritized rows (asc priority, createdAt desc tiebreak), capped at limit + 1.
        // 2) non-prioritized rows (createdAt desc), filling the remainder.
        const priRows = await prisma.campaign.findMany({
          where: { ...where, NOT: { priority: null } },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          take: limit + 1,
          include: includeShape,
        });
        const remaining = Math.max(0, limit + 1 - priRows.length);
        const recentRows = remaining > 0
          ? await prisma.campaign.findMany({
              where: { ...where, priority: null },
              orderBy: { createdAt: 'desc' },
              take: remaining,
              include: includeShape,
            })
          : [];
        return [...priRows, ...recentRows];
      }
      if (applyPriorityFallbackSort && cursor) {
        // Subsequent pages: paginate the non-prioritized list by createdAt desc.
        // Page 1 already showed all prioritized rows that fit, so we exclude them here to
        // avoid duplicates and gaps.
        return prisma.campaign.findMany({
          where: { ...where, priority: null },
          take: limit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'desc' },
          include: includeShape,
        });
      }
      return prisma.campaign.findMany({
        where,
        take: limit + 1,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy,
        include: includeShape,
      });
    })();

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

    // Handle in-memory sorting. With applyPriorityFallbackSort the fan-out above already
    // returns rows in the desired (prioritized → newest) order, so we only re-sort here for
    // the special cases that can't be expressed in the Prisma orderBy.
    let sortedCampaigns = [...filteredCampaigns];
    if (sortBy === 'progress') {
      sortedCampaigns.sort((a, b) => {
        const ga = normalizeGoalType(a.goalType);
        const gb = normalizeGoalType(b.goalType);
        const progressA = computeCampaignProgressPercent(a.currentAmount, a.targetAmount, ga) / 100;
        const progressB = computeCampaignProgressPercent(b.currentAmount, b.targetAmount, gb) / 100;
        return progressB - progressA;
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
        // Locale-aware slug: per-locale translation slug → base slug → null. The base
        // slug is also exposed for callers that need it (sitemap, hreflang alternates).
        slug: (tC as { slug?: string | null } | undefined)?.slug || campaign.slug || null,
        baseSlug: campaign.slug ?? null,
        title: tC?.title || campaign.title,
        description: tC?.description || campaign.description,
        images:
          tC?.image && Array.isArray(campaign.images)
            ? [tC.image, ...campaign.images.slice(1)]
            : campaign.images,
        videoUrl: tC?.videoUrl || campaign.videoUrl,
        targetAmount: campaign.targetAmount,
        currentAmount: campaign.currentAmount,
        isActive: campaign.isActive,
        priority: campaign.priority,
        category: campaign.category
          ? {
              id: campaign.category.id,
              slug:
                (tCat as { slug?: string | null } | undefined)?.slug ||
                campaign.category.slug ||
                null,
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

    const translationData: {
      locale: string;
      title: string;
      description: string;
      image: string | null;
      videoUrl: string | null;
      slug: string | null;
      /** Raw user slug input — null if not provided. The actual unique slug is computed
       *  inside the transaction so the uniqueness check sees in-flight inserts. */
      requestedSlug: string | null;
    }[] = [];

    if (data.translations && typeof data.translations === 'object') {
      for (const [locale, trans] of Object.entries(data.translations)) {
        if (locale !== 'ar' && trans && typeof trans === 'object') {
          const t = trans as any;
          // Only add translation if BOTH title and description are provided
          if (t.title && t.description) {
            const requestedSlug = normalizeUserSlug(t.slug);
            translationData.push({
              locale,
              title: t.title,
              description: t.description,
              image: typeof t.image === "string" && t.image.trim() ? t.image.trim() : null,
              videoUrl:
                typeof t.videoUrl === "string" && t.videoUrl.trim() ? t.videoUrl.trim() : null,
              // Computed inside the transaction.
              slug: null,
              requestedSlug,
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

      const seededCurrentAmount =
        typeof data.currentAmount === "number" &&
        Number.isFinite(data.currentAmount) &&
        data.currentAmount >= 0
          ? data.currentAmount
          : 0;

      const newCampaign = await tx.campaign.create({
        data: {
          title: data.title,
          description: data.description,
          slug,
          targetAmount,
          currentAmount: seededCurrentAmount,
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

      // Create translations if provided. We do this sequentially (rather than createMany)
      // so the per-locale slug uniqueness check inside generateUniqueLocaleSlug observes
      // earlier inserts in the same transaction.
      for (const t of translationData) {
        const localeSlug = await generateUniqueLocaleSlug(
          tx.campaignTranslation as any,
          t.requestedSlug ?? t.title,
          { locale: t.locale, fallbackPrefix: "campaign" }
        );
        await tx.campaignTranslation.create({
          data: {
            campaignId: newCampaign.id,
            locale: t.locale,
            title: t.title,
            description: t.description,
            image: t.image,
            videoUrl: t.videoUrl,
            slug: localeSlug,
          },
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