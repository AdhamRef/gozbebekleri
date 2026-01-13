import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Number(searchParams.get('limit')) || 10;
    
    // New filter parameters
    const search = searchParams.get('search')?.toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, amount-high, amount-low, progress
    const minAmount = Number(searchParams.get('minAmount')) || 0;
    const maxAmount = Number(searchParams.get('maxAmount')) || Infinity;
    const isActive = searchParams.get('isActive') === 'true';
    const hasPriority = searchParams.get('hasPriority') === 'true';

    // Build where clause
    const where: any = {
      AND: [
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
    let orderBy: any = { createdAt: 'desc' }; // default sorting
    switch (sortBy) {
      case 'amount-high':
        orderBy = { currentAmount: 'desc' };
        break;
      case 'amount-low':
        orderBy = { currentAmount: 'asc' };
        break;
      case 'progress':
        // Note: Complex sorting might need to be handled in-memory
        orderBy = { currentAmount: 'desc' };
        break;
      case 'priority':
        orderBy = { priority: 'asc' };
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
            name: true,
            icon: true,
          },
        },
        _count: {
          select: { donations: true }
        }
      },
    });

    // Handle progress sorting in memory if needed
    let sortedCampaigns = [...campaigns];
    if (sortBy === 'progress') {
      sortedCampaigns.sort((a, b) => {
        const progressA = a.currentAmount / a.targetAmount;
        const progressB = b.currentAmount / b.targetAmount;
        return progressB - progressA;
      });
    }

    const hasMore = sortedCampaigns.length > limit;
    const items = hasMore ? sortedCampaigns.slice(0, -1) : sortedCampaigns;
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
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure request body is valid
    const body = await request.json();
    
    // Destructure and validate required fields
    const { title, description, targetAmount, images, videoUrl, categoryId } = body;

    // Input validation
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json(
        { error: "Valid target amount is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 }
      );
    }

    // Create campaign with validated data
    const newCampaign = await prisma.campaign.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        targetAmount: Number(targetAmount),
        images,
        videoUrl: videoUrl?.trim() || null,
        categoryId: categoryId || null
      },
    });

    return NextResponse.json(newCampaign, { status: 200 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    
    // Handle specific Prisma errors if needed
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A campaign with this title already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}