// app/api/campaigns/[id]/updates/route.ts
// High-performance campaign updates endpoint with multi-language support
// GET /api/campaigns/[id]/updates - Get all updates for a campaign
// POST /api/campaigns/[id]/updates - Create new update (admin only)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";

interface Params {
  params: {
    id: string;
  };
}

// ✅ GET - Fetch campaign updates with translations
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const locale = request.headers.get("x-locale") || "ar";

    // ✅ Performance optimization: Fetch only needed fields with locale-specific translations
    const updates = await prisma.update.findMany({
      where: {
        campaignId: id,
      },
      select: {
        id: true,
        title: true,        // Arabic default
        description: true,  // Arabic default
        image: true,
        videoUrl: true,
        createdAt: true,
        
        // Only fetch translation for current locale
        translations: {
          where: { locale },
          select: {
            title: true,
            description: true,
          },
          take: 1, // Only 1 translation per update
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to prevent huge payloads
    });

    // ✅ Transform: Use translation if available, fallback to Arabic
    const transformedUpdates = updates.map((update) => ({
      id: update.id,
      title: update.translations[0]?.title || update.title,
      description: update.translations[0]?.description || update.description,
      image: update.image,
      videoUrl: update.videoUrl,
      createdAt: update.createdAt.toISOString(),
    }));

    return NextResponse.json(transformedUpdates, {
      headers: {
        // Cache for 2 minutes
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
      },
    });
    
  } catch (error) {
    console.error("Error fetching updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

// ✅ POST - Create new update with translations (admin only)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // ✅ STEP 1: Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized - Only admins can add updates" },
        { status: 401 }
      );
    }

    const { id } = params;
    const data = await request.json();

    // ✅ STEP 2: Validate campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // ✅ STEP 3: Validate required fields
    if (!data.title || !data.description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // ✅ STEP 4: Prepare translation data
    // Expected format: { translations: { en: { title, description }, fr: {...} } }
    const translationData: { locale: string; title: string; description: string }[] = [];
    
    if (data.translations && typeof data.translations === 'object') {
      for (const [locale, trans] of Object.entries(data.translations)) {
        if (locale !== 'ar' && trans && typeof trans === 'object') {
          const t = trans as any;
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

    // ✅ STEP 5: Create update with translations in a transaction
    const update = await prisma.$transaction(async (tx) => {
      // Create main update (Arabic)
      const newUpdate = await tx.update.create({
        data: {
          title: data.title,
          description: data.description,
          image: data.image || null,
          videoUrl: data.videoUrl || null,
          campaignId: id,
        },
      });

      // Create translations if provided
      if (translationData.length > 0) {
        await tx.updateTranslation.createMany({
          data: translationData.map((t) => ({
            updateId: newUpdate.id,
            locale: t.locale,
            title: t.title,
            description: t.description,
          })),
        });
      }

      return newUpdate;
    });

    // ✅ STEP 6: Fetch created update with all translations
    const fullUpdate = await prisma.update.findUnique({
      where: { id: update.id },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        videoUrl: true,
        createdAt: true,
        translations: {
          select: {
            locale: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json(fullUpdate, { status: 201 });
    
  } catch (error) {
    console.error("Error creating update:", error);
    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
}

// ✅ Cache revalidation: 2 minutes
export const revalidate = 120;