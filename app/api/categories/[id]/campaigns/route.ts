import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeCampaignProgressPercent,
  normalizeFundraisingMode,
  normalizeGoalType,
  parseSuggestedShareCounts,
  showCampaignProgress,
} from "@/lib/campaign/campaign-modes";
import { parseSuggestedDonations } from "@/lib/campaign/suggested-donations";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";
import { whereByIdOrLocaleSlug } from "@/lib/slug";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    if (!idOrSlug || idOrSlug === 'undefined') {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
    }
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor'); // Last item's ID from previous batch
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 100); // cap for safety
    const locale = searchParams.get('locale') || 'ar';

    // Filters
    const search = searchParams.get('search')?.toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'newest';
    const minAmount = Number(searchParams.get('minAmount')) || 0;
    const maxAmount = Number(searchParams.get('maxAmount')) || Infinity;
    const isActive = searchParams.get('isActive') === 'true';
    const hasPriority = searchParams.get('hasPriority') === 'true';

    // Check that category exists and fetch localized name if available. Resolves the
    // param against the category's base slug or any per-locale translation slug.
    const category = await prisma.category.findFirst({
      where: whereByIdOrLocaleSlug(idOrSlug, locale),
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        translations: { where: translationLocaleWhere(locale), take: 2, select: { locale: true, name: true, slug: true } }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const id = category.id;

    // Build where clause
    const where: any = {
      categoryId: id,
      AND: [
        { targetAmount: { gte: minAmount } },
        maxAmount < Infinity ? { targetAmount: { lte: maxAmount } } : {},
        isActive ? { isActive: true } : {},
        hasPriority ? { NOT: { priority: null } } : {}
      ].filter(Boolean)
    };

    // If search is provided, add conditions that check both base and translated fields
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { translations: { some: { locale, title: { contains: search, mode: 'insensitive' } } } },
          { translations: { some: { locale, description: { contains: search, mode: 'insensitive' } } } }
        ]
      });
    }

    // Build orderBy based on sortBy parameter.
    // Default ("newest") applies the per-category priority first (the dashboard reorder
    // dialog sets `categoryPriority`), then the global priority as a tiebreaker, then
    // newest. Explicit user sorts (amount-high/-low, progress) override priority entirely.
    // Mongo's ascending sort places null FIRST, so a single multi-field orderBy would
    // mostly return unprioritized rows in the page slice. We fan out into two queries on
    // page 1 — prioritized first, then non-prioritized recency — and merge.
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
        // We'll sort by progress in-memory after fetching the page
        orderBy = { createdAt: 'desc' };
        break;
    }

    const selectShape = {
      id: true,
      slug: true,
      title: true,
      description: true,
      images: true,
      videoUrl: true,
      targetAmount: true,
      currentAmount: true,
      isActive: true,
      priority: true,
      categoryPriority: true,
      createdAt: true,
      updatedAt: true,
      goalType: true,
      fundraisingMode: true,
      sharePriceUSD: true,
      suggestedShareCounts: true,
      suggestedDonations: true,
      translations: { where: translationLocaleWhere(locale), take: 2, select: { title: true, description: true, locale: true, slug: true } },
      _count: { select: { donations: true } },
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          icon: true,
          translations: { where: translationLocaleWhere(locale), take: 2, select: { locale: true, name: true, slug: true } },
        },
      },
    } satisfies Prisma.CampaignSelect;

    const campaigns = await (async () => {
      if (applyPriorityFallbackSort && !cursor) {
        // First page: prioritized rows (categoryPriority asc, then global priority asc),
        // then non-prioritized rows by createdAt desc to fill the page.
        const priRows = await prisma.campaign.findMany({
          where: {
            ...where,
            OR: [{ NOT: { categoryPriority: null } }, { NOT: { priority: null } }],
          },
          orderBy: [
            { categoryPriority: 'asc' },
            { priority: 'asc' },
            { createdAt: 'desc' },
          ],
          take: limit + 1,
          select: selectShape,
        });
        const remaining = Math.max(0, limit + 1 - priRows.length);
        const recentRows = remaining > 0
          ? await prisma.campaign.findMany({
              where: { ...where, categoryPriority: null, priority: null },
              orderBy: { createdAt: 'desc' },
              take: remaining,
              select: selectShape,
            })
          : [];
        return [...priRows, ...recentRows];
      }
      if (applyPriorityFallbackSort && cursor) {
        // Subsequent pages: paginate non-prioritized rows by createdAt desc.
        return prisma.campaign.findMany({
          where: { ...where, categoryPriority: null, priority: null },
          take: limit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'desc' },
          select: selectShape,
        });
      }
      return prisma.campaign.findMany({
        where,
        take: limit + 1,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy,
        select: selectShape,
      });
    })();

    // Sort by progress in-memory if requested. Other sorts (newest/priority/amount) are
    // already in the desired order from the queries above.
    let sorted = [...campaigns];
    if (sortBy === 'progress') {
      sorted.sort((a, b) => {
        const ga = normalizeGoalType(a.goalType);
        const gb = normalizeGoalType(b.goalType);
        const pa =
          computeCampaignProgressPercent(a.currentAmount, a.targetAmount, ga) / 100;
        const pb =
          computeCampaignProgressPercent(b.currentAmount, b.targetAmount, gb) / 100;
        return pb - pa;
      });
    }

    const hasMore = sorted.length > limit;
    const pageItems = hasMore ? sorted.slice(0, -1) : sorted;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : null;

    const transformed = pageItems.map((c) => {
      const goalType = normalizeGoalType(c.goalType);
      const fundraisingMode = normalizeFundraisingMode(c.fundraisingMode);
      const tC = pickTranslation(c.translations, locale);
      const tCat = pickTranslation(c.category?.translations, locale);
      return {
        id: c.id,
        // Locale-aware slug: per-locale translation slug → base slug → null.
        // Drives /campaign/[slug] links from this list.
        slug: (tC as { slug?: string | null } | undefined)?.slug || c.slug || null,
        baseSlug: c.slug ?? null,
        title: tC?.title || c.title,
        description: tC?.description || c.description,
        images: c.images,
        videoUrl: c.videoUrl,
        targetAmount: c.targetAmount,
        currentAmount: c.currentAmount,
        isActive: c.isActive,
        priority: c.priority,
        donationCount: c._count?.donations ?? 0,
        progress: computeCampaignProgressPercent(
          c.currentAmount,
          c.targetAmount,
          goalType
        ),
        showProgress: showCampaignProgress(goalType),
        goalType,
        fundraisingMode,
        sharePriceUSD: c.sharePriceUSD ?? null,
        suggestedShareCounts: parseSuggestedShareCounts(c.suggestedShareCounts),
        suggestedDonations: parseSuggestedDonations(c.suggestedDonations),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        category: c.category
          ? {
              id: c.category.id,
              slug:
                (tCat as { slug?: string | null } | undefined)?.slug ||
                c.category.slug ||
                null,
              name: tCat?.name || c.category.name,
              icon: c.category.icon,
            }
          : null,
      };
    });

    // Localized category response — surface the per-locale slug for canonical URLs
    const tCatPicked = pickTranslation(category.translations, locale);
    const localizedCategory = {
      id: category.id,
      slug:
        (tCatPicked as { slug?: string | null } | undefined)?.slug ||
        category.slug ||
        null,
      baseSlug: category.slug ?? null,
      name: tCatPicked?.name || category.name,
      icon: category.icon,
    };

    return NextResponse.json({
      items: transformed,
      nextCursor,
      hasMore,
      category: localizedCategory,
      filters: { search, sortBy, minAmount, maxAmount, isActive, hasPriority, locale }
    });
  } catch (error) {
    console.error('Error fetching category campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch category campaigns' }, { status: 500 });
  }
} 