// app/api/campaigns/[id]/route.ts
// Campaign detail endpoint with GET and PUT operations
// GET /api/campaigns/[id] - Returns one specific campaign with all details
// PUT /api/campaigns/[id] - Updates campaign data

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";

// ✅ Prisma Singleton - Reuse connection across requests
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // Campaign ID from URL
    const locale = request.headers.get("x-locale") || "ar";

    // ✅ STEP 1: Fetch campaign with ONLY current locale translations
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        // Basic fields
        id: true,
        title: true,        // Arabic default
        description: true,  // Arabic default
        images: true,
        videoUrl: true,
        currentAmount: true,
        targetAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        
        // Get ONLY current locale translation (not all 3)
        translations: {
          where: { locale }, // Filters at DB level
          select: {
            title: true,
            description: true,
          },
          take: 1, // Only 1 translation needed
        },
        
        // Category with translation
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            translations: {
              where: { locale },
              select: { name: true },
              take: 1,
            },
          },
        },
        
        // Updates with translations (limit to 20)
        updates: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            videoUrl: true,
            createdAt: true,
            translations: {
              where: { locale },
              select: {
                title: true,
                description: true,
              },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20, // Limit to prevent huge payloads
        },
      },
    });

    // If campaign not found
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // ✅ STEP 2: Get donation stats with PARALLEL queries
    // Instead of loading 100+ donations, we get only what we need
    const [donationCount, firstDonation, lastDonation, largestDonation] = 
      await Promise.all([
        // Total count of donations for this campaign
        prisma.donationItem.count({
          where: { campaignId: id },
        }),
        
        // First donation (oldest)
        prisma.donationItem.findFirst({
          where: { campaignId: id },
          orderBy: { createdAt: "asc" },
          select: {
            amount: true,
            donation: {
              select: {
                donor: {
                  select: { name: true },
                },
              },
            },
          },
        }),
        
        // Last donation (newest)
        prisma.donationItem.findFirst({
          where: { campaignId: id },
          orderBy: { createdAt: "desc" },
          select: {
            amount: true,
            donation: {
              select: {
                donor: {
                  select: { name: true },
                },
              },
            },
          },
        }),
        
        // Largest donation (highest amount)
        prisma.donationItem.findFirst({
          where: { campaignId: id },
          orderBy: { amount: "desc" },
          select: {
            amount: true,
            donation: {
              select: {
                donor: {
                  select: { name: true },
                },
              },
            },
          },
        }),
      ]);

    // ✅ STEP 3: Transform data to match frontend expectations
    const transformedCampaign = {
      id: campaign.id,
      
      // Use translation if available, fallback to Arabic
      title: campaign.translations[0]?.title || campaign.title,
      description: campaign.translations[0]?.description || campaign.description,
      
      images: campaign.images,
      videoUrl: campaign.videoUrl,
      currentAmount: campaign.currentAmount,
      targetAmount: campaign.targetAmount,
      amountRaised: campaign.currentAmount, // Alias for compatibility
      donationCount: donationCount,
      progress: (campaign.currentAmount / campaign.targetAmount) * 100,
      isActive: campaign.isActive,
      
      // Category with translation
      category: campaign.category ? {
        id: campaign.category.id,
        name: campaign.category.translations[0]?.name || campaign.category.name,
        icon: campaign.category.icon,
      } : null,
      
      // Updates with translations
      updates: campaign.updates.map((update) => ({
        id: update.id,
        title: update.translations[0]?.title || update.title,
        description: update.translations[0]?.description || update.description,
        image: update.image,
        videoUrl: update.videoUrl,
        createdAt: update.createdAt.toISOString(),
      })),
      
      // Donation statistics
      donationStats: {
        first: firstDonation ? {
          amount: firstDonation.amount,
          donor: firstDonation.donation?.donor?.name || "Anonymous",
        } : null,
        
        largest: largestDonation ? {
          amount: largestDonation.amount,
          donor: largestDonation.donation?.donor?.name || "Anonymous",
        } : null,
        
        last: lastDonation ? {
          amount: lastDonation.amount,
          donor: lastDonation.donation?.donor?.name || "Anonymous",
        } : null,
      },
      
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };

    // Return with cache headers
    return NextResponse.json(transformedCampaign, {
      headers: {
        // Browser & CDN can cache for 5 minutes
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
    
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// ✅ PUT - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // ✅ STEP 1: Validate campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // ✅ STEP 2: Prepare update data
    // Separate main fields from translation fields
    const updateData: any = {};
    const translationUpdates: { locale: string; data: any }[] = [];

    // Main campaign fields (Arabic default)
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.targetAmount !== undefined) updateData.targetAmount = body.targetAmount;
    if (body.currentAmount !== undefined) updateData.currentAmount = body.currentAmount;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;

    // ✅ STEP 3: Handle translations if provided
    // Expected format: { translations: { en: { title, description }, fr: {...} } }
    if (body.translations && typeof body.translations === 'object') {
      for (const [locale, data] of Object.entries(body.translations)) {
        if (locale !== 'ar' && data && typeof data === 'object') {
          translationUpdates.push({
            locale,
            data: data as any,
          });
        }
      }
    }

    // ✅ STEP 4: Execute update in transaction
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      // Update main campaign
      const campaign = await tx.campaign.update({
        where: { id },
        data: updateData,
      });

      // Update or create translations
      for (const { locale, data } of translationUpdates) {
        const translationData: any = {};
        if (data.title !== undefined) translationData.title = data.title;
        if (data.description !== undefined) translationData.description = data.description;

        // Skip if no translation data
        if (Object.keys(translationData).length === 0) continue;

        await tx.campaignTranslation.upsert({
          where: {
            campaignId_locale: {
              campaignId: id,
              locale,
            },
          },
          update: translationData,
          create: {
            campaignId: id,
            locale,
            ...translationData,
          },
        });
      }

      return campaign;
    });

    // ✅ STEP 5: Fetch updated campaign with all translations
    const fullCampaign = await prisma.campaign.findUnique({
      where: { id },
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
      },
    });

    return NextResponse.json(fullCampaign, {
      status: 200,
    });

  } catch (error) {
    console.error("Error updating campaign:", error);
    
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
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Delete campaign (admin only) - refuses if donations exist
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Only admins can delete campaigns' }, { status: 401 });
    }

    const { id } = params;

    // Ensure campaign exists
    const camp = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
    if (!camp) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check for donations
    const donationCount = await prisma.donationItem.count({ where: { campaignId: id } });
    const force = request.nextUrl.searchParams.get('force') === 'true';
    if (donationCount > 0 && !force) {
      return NextResponse.json({ error: 'Campaign has donations. Use force=true to remove donation items and delete the campaign.' }, { status: 400 });
    }

    // Safe delete: if force is true, remove donation items (and orphaned donations) before deleting campaign
    await prisma.$transaction(async (tx) => {
      if (donationCount > 0 && force) {
        // Delete donation items for this campaign
        await tx.donationItem.deleteMany({ where: { campaignId: id } });

        // Delete donations that have no items left
        const orphanDonations = await tx.donation.findMany({
          where: { items: { none: {} } },
          select: { id: true }
        });
        if (orphanDonations.length > 0) {
          await tx.donation.deleteMany({ where: { id: { in: orphanDonations.map(d => d.id) } } });
        }
      }

      // Delete updates (translations will cascade)
      await tx.update.deleteMany({ where: { campaignId: id } });

      // Delete campaign translations
      await tx.campaignTranslation.deleteMany({ where: { campaignId: id } });

      // Delete comments and cart items
      await tx.comment.deleteMany({ where: { campaignId: id } });
      await tx.cartItem.deleteMany({ where: { campaignId: id } });

      // Finally delete campaign
      await tx.campaign.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'تم مسح الحملة' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}

// ✅ Next.js ISR: Regenerate every 5 minutes
export const revalidate = 300;