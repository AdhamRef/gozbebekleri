import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check if the category exists
    const category = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get cursor and limit from URL params
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');  // Last item's ID from previous batch
    const limit = Number(searchParams.get('limit')) || 10;  // Default to 10 items
    
    // New filter parameters
    const search = searchParams.get('search')?.toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'newest';
    const minAmount = Number(searchParams.get('minAmount')) || 0;
    const maxAmount = Number(searchParams.get('maxAmount')) || Infinity;
    const isActive = searchParams.get('isActive') === 'true';
    const hasPriority = searchParams.get('hasPriority') === 'true';

    // Build where clause
    const where: any = {
      AND: [
        { categoryId: params.id },
        // Search in title and description
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        // Amount range
        { targetAmount: { gte: minAmount } },
        maxAmount < Infinity ? { targetAmount: { lte: maxAmount } } : {},
        // Active status
        isActive ? { isActive: true } : {},
        // Priority filter
        hasPriority ? { NOT: { priority: null } } : {}
      ]
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
        orderBy = { priority: 'asc' };
        break;
    }

    // Get all campaigns for this category with cursor-based pagination
    const campaigns = await prisma.campaign.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there are more items
      ...(cursor && {
        skip: 1, // Skip the cursor item
        cursor: {
          id: cursor,
        },
      }),
      orderBy,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        _count: {
          select: { donations: true }
        }
      },
    });

    console.log('Fetched campaigns:', campaigns);

    // Handle progress sorting in memory if needed
    let sortedCampaigns = [...campaigns];
    if (sortBy === 'progress') {
      sortedCampaigns.sort((a, b) => {
        const progressA = a.currentAmount / a.targetAmount;
        const progressB = b.currentAmount / b.targetAmount;
        return progressB - progressA;
      });
    }

    // Check if there are more items
    const hasMore = sortedCampaigns.length > limit;
    const items = hasMore ? sortedCampaigns.slice(0, -1) : sortedCampaigns;

    // Get the next cursor
    const nextCursor = hasMore ? sortedCampaigns[sortedCampaigns.length - 2].id : null;

    const transformedCampaigns = items.map(campaign => ({
      ...campaign,
      donationCount: campaign._count.donations,
      progress: (campaign.currentAmount / campaign.targetAmount) * 100,
      _count: undefined
    }));

    return NextResponse.json({
      items: transformedCampaigns,
      nextCursor,
      hasMore,
      category,
      filters: {
        search,
        sortBy,
        minAmount,
        maxAmount,
        isActive,
        hasPriority
      }
    });
  } catch (error) {
    console.error('Error fetching category campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category campaigns' },
      { status: 500 }
    );
  }
} 