import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined') {
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

    // Check that category exists and fetch localized name if available
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        icon: true,
        translations: { where: { locale }, take: 1, select: { name: true } }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

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
        // We'll sort by progress in-memory after fetching the page
        orderBy = { createdAt: 'desc' };
        break;
      case 'priority':
        orderBy = { priority: 'asc' };
        break;
    }

    // Query campaigns and include localized translation and campaign counts
    const campaigns = await prisma.campaign.findMany({
      where,
      take: limit + 1, // fetch one extra to determine if there's more
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        images: true,
        videoUrl: true,
        targetAmount: true,
        currentAmount: true,
        isActive: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        translations: { where: { locale }, take: 1, select: { title: true, description: true, locale: true } },
        _count: { select: { donations: true } },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            translations: { where: { locale }, take: 1, select: { name: true } }
          }
        }
      }
    });

    // Sort by progress in-memory if requested
    let sorted = [...campaigns];
    if (sortBy === 'progress') {
      sorted.sort((a, b) => {
        const pa = a.currentAmount / Math.max(a.targetAmount, 1);
        const pb = b.currentAmount / Math.max(b.targetAmount, 1);
        return pb - pa;
      });
    }

    const hasMore = sorted.length > limit;
    const pageItems = hasMore ? sorted.slice(0, -1) : sorted;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : null;

    const transformed = pageItems.map(c => ({
      id: c.id,
      title: c.translations[0]?.title || c.title,
      description: c.translations[0]?.description || c.description,
      images: c.images,
      videoUrl: c.videoUrl,
      targetAmount: c.targetAmount,
      currentAmount: c.currentAmount,
      isActive: c.isActive,
      priority: c.priority,
      donationCount: c._count?.donations ?? 0,
      progress: (c.currentAmount / Math.max(c.targetAmount, 1)) * 100,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      category: c.category ? {
        id: c.category.id,
        name: c.category.translations[0]?.name || c.category.name,
        icon: c.category.icon,
      } : null
    }));

    // Localized category response
    const localizedCategory = {
      id: category.id,
      name: category.translations[0]?.name || category.name,
      icon: category.icon
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