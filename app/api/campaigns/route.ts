import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

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
    const isActive = searchParams.get('isActive') === 'true';
    const hasPriority = searchParams.get('hasPriority') === 'true';

    // Build where clause for main fields
    const where: any = {
      AND: [
        // Amount range
        { targetAmount: { gte: minAmount } },
        maxAmount < Infinity ? { targetAmount: { lte: maxAmount } } : {},
        // Active status
        isActive ? { isActive: true } : {},
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
            translations: {
              where: { locale },
              take: 1,
            },
          },
        },
        translations: {
          where: { locale },
          take: 1,
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
        const title = campaign.translations[0]?.title || campaign.title;
        const description = campaign.translations[0]?.description || campaign.description;
        
        return (
          title?.toLowerCase().includes(search) ||
          description?.toLowerCase().includes(search)
        );
      });
    }

    // Handle progress sorting in memory if needed
    let sortedCampaigns = [...filteredCampaigns];
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
      id: campaign.id,
      // Use translated fields if available, otherwise fall back to default (Arabic)
      title: campaign.translations[0]?.title || campaign.title,
      description: campaign.translations[0]?.description || campaign.description,
      images: campaign.images,
      videoUrl: campaign.videoUrl,
      targetAmount: campaign.targetAmount,
      currentAmount: campaign.currentAmount,
      isActive: campaign.isActive,
      priority: campaign.priority,
      category: campaign.category ? {
        id: campaign.category.id,
        name: campaign.category.translations[0]?.name || campaign.category.name,
        icon: campaign.category.icon,
      } : null,
      donationCount: campaign._count.donations,
      progress: (campaign.currentAmount / campaign.targetAmount) * 100,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
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
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can create campaigns" },
        { status: 401 }
      );
    }

    const data = await request.json();

    // ✅ STEP 2: Validate required fields
    if (!data.title || !data.description || !data.targetAmount || !data.categoryId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, targetAmount, categoryId" },
        { status: 400 }
      );
    }

    if (!data.images || data.images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
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

    // ✅ STEP 5: Create campaign with translations in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      // Create main campaign (Arabic)
      const newCampaign = await tx.campaign.create({
        data: {
          title: data.title,
          description: data.description,
          targetAmount: data.targetAmount,
          currentAmount: 0,
          categoryId: data.categoryId,
          isActive: data.isActive ?? true,
          images: data.images,
          videoUrl: data.videoUrl || null,
          priority: data.priority || null,
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
            name: true,
            icon: true,
          },
        },
      },
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