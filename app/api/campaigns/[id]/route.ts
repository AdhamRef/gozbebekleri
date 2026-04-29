// app/api/campaigns/[id]/route.ts
// Campaign detail endpoint with GET and PUT operations
// GET /api/campaigns/[id] - Returns one specific campaign with all details
// PUT /api/campaigns/[id] - Updates campaign data

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";
import {
  parseSuggestedDonations,
  validateSuggestedDonationsBody,
} from "@/lib/campaign/suggested-donations";
import {
  computeCampaignProgressPercent,
  normalizeFundraisingMode,
  normalizeGoalType,
  parseSuggestedShareCounts,
  showCampaignProgress,
  validateSuggestedShareCountsBody,
  FUNDRAISING_SHARES,
} from "@/lib/campaign/campaign-modes";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";
import {
  generateUniqueSlug,
  generateUniqueLocaleSlug,
  normalizeUserSlug,
  whereByIdOrLocaleSlug,
} from "@/lib/slug";

// ✅ Prisma Singleton - Reuse connection across requests
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Campaign ID from URL
    const url = new URL(request.url);
    const locale =
      request.headers.get("x-locale") ||
      url.searchParams.get("locale") ||
      "ar";

    // ✅ STEP 1: Fetch campaign with ONLY current locale translations
    // Accept either an ObjectId, the base slug, or a per-locale translation slug.
    const campaign = await prisma.campaign.findFirst({
      where: whereByIdOrLocaleSlug(id, locale),
      select: {
        // Basic fields
        id: true,
        slug: true,
        title: true,        // Arabic default
        description: true,  // Arabic default
        images: true,
        videoUrl: true,
        currentAmount: true,
        targetAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        suggestedDonations: true,
        goalType: true,
        fundraisingMode: true,
        sharePriceUSD: true,
        suggestedShareCounts: true,

        // Requested locale + English fallback (base Arabic is on the model itself)
        translations: {
          where: translationLocaleWhere(locale),
          select: {
            locale: true,
            title: true,
            description: true,
            image: true,
            videoUrl: true,
            slug: true,
          },
          take: 2,
        },

        // Category with translation
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            translations: {
              where: translationLocaleWhere(locale),
              select: { locale: true, name: true },
              take: 2,
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
              where: translationLocaleWhere(locale),
              select: {
                locale: true,
                title: true,
                description: true,
              },
              take: 2,
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
    // Use the resolved Prisma id (since the URL param may have been a slug)
    const realId = campaign.id;
    const [donationCount, firstDonation, lastDonation, largestDonation] =
      await Promise.all([
        // Total count of donations for this campaign
        prisma.donationItem.count({
          where: { campaignId: realId },
        }),

        // First donation (oldest)
        prisma.donationItem.findFirst({
          where: { campaignId: realId },
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
          where: { campaignId: realId },
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
          where: { campaignId: realId },
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

    const goalType = normalizeGoalType(campaign.goalType);
    const fundraisingMode = normalizeFundraisingMode(campaign.fundraisingMode);
    const showProgress = showCampaignProgress(goalType);

    const tCampaign = pickTranslation(campaign.translations, locale);
    const tCategory = pickTranslation(campaign.category?.translations, locale);

    // ✅ STEP 3: Transform data to match frontend expectations
    const transformedCampaign = {
      id: campaign.id,
      // Locale-aware slug: per-locale translation slug → base slug → null. Public callers
      // use this for canonical URLs in the requested locale.
      slug: tCampaign?.slug || campaign.slug || null,
      baseSlug: campaign.slug ?? null,

      // Requested locale → English → Arabic (base) fallback
      title: tCampaign?.title || campaign.title,
      description: tCampaign?.description || campaign.description,

      // When a translation supplies its own cover image, swap images[0] with it; rest of the
      // gallery is shared across locales (single source of truth on the campaign model).
      images:
        tCampaign?.image && Array.isArray(campaign.images)
          ? [tCampaign.image, ...campaign.images.slice(1)]
          : campaign.images,
      videoUrl: tCampaign?.videoUrl || campaign.videoUrl,
      currentAmount: campaign.currentAmount,
      targetAmount: campaign.targetAmount,
      amountRaised: campaign.currentAmount, // Alias for compatibility
      donationCount: donationCount,
      progress: computeCampaignProgressPercent(
        campaign.currentAmount,
        campaign.targetAmount,
        goalType
      ),
      showProgress,
      goalType,
      fundraisingMode,
      sharePriceUSD: campaign.sharePriceUSD ?? null,
      suggestedShareCounts: parseSuggestedShareCounts(campaign.suggestedShareCounts),
      isActive: campaign.isActive,
      
      // Category with translation
      category: campaign.category ? {
        id: campaign.category.id,
        name: tCategory?.name || campaign.category.name,
        icon: campaign.category.icon,
      } : null,

      // Updates with translations
      updates: campaign.updates.map((update) => {
        const tU = pickTranslation(update.translations, locale);
        return {
          id: update.id,
          title: tU?.title || update.title,
          description: tU?.description || update.description,
          image: update.image,
          videoUrl: update.videoUrl,
          createdAt: update.createdAt.toISOString(),
        };
      }),
      
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

      suggestedDonations: parseSuggestedDonations(campaign.suggestedDonations),
      
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    const { id: idOrSlug } = await params;
    const body = await request.json();

    // ✅ STEP 1: Validate campaign exists (param may be id, base slug, or locale slug)
    const existingCampaign = await prisma.campaign.findFirst({
      where: whereByIdOrLocaleSlug(idOrSlug, "ar"),
      select: { id: true, fundraisingMode: true, goalType: true, title: true },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }
    const id = existingCampaign.id;

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

    if (body.goalType !== undefined) {
      updateData.goalType = normalizeGoalType(body.goalType);
    }
    if (body.fundraisingMode !== undefined) {
      updateData.fundraisingMode = normalizeFundraisingMode(body.fundraisingMode);
    }
    if (body.sharePriceUSD !== undefined) {
      const nextMode =
        body.fundraisingMode !== undefined
          ? normalizeFundraisingMode(body.fundraisingMode)
          : normalizeFundraisingMode(existingCampaign.fundraisingMode);
      const sp = Number(body.sharePriceUSD);
      if (nextMode === FUNDRAISING_SHARES) {
        if (!Number.isFinite(sp) || sp <= 0) {
          return NextResponse.json(
            { error: "sharePriceUSD must be a positive number for share-based campaigns" },
            { status: 400 }
          );
        }
      }
      updateData.sharePriceUSD =
        Number.isFinite(sp) && sp > 0 ? sp : null;
    }
    if (body.suggestedShareCounts !== undefined) {
      try {
        if (body.suggestedShareCounts === null) {
          updateData.suggestedShareCounts = null;
        } else {
          const v = validateSuggestedShareCountsBody(body.suggestedShareCounts);
          if (v) updateData.suggestedShareCounts = v as unknown as Prisma.InputJsonValue;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid suggestedShareCounts";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (body.suggestedDonations !== undefined) {
      try {
        if (body.suggestedDonations === null) {
          updateData.suggestedDonations = null;
        } else {
          const v = validateSuggestedDonationsBody(body.suggestedDonations);
          if (v) updateData.suggestedDonations = v as unknown as Prisma.InputJsonValue;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid suggestedDonations";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // Slug: explicit value (admin override) or auto-regenerate from English title.
    // When the admin clears the slug, we fall back to the new English title (if
    // they're updating translations now), then the saved English translation,
    // then the campaign's base (Arabic) title as a last resort.
    if (body.slug !== undefined) {
      const cleaned = normalizeUserSlug(body.slug);
      let base = cleaned ?? "";
      if (!base) {
        const newEnTitle =
          typeof body?.translations?.en?.title === "string"
            ? body.translations.en.title.trim()
            : "";
        if (newEnTitle) {
          base = newEnTitle;
        } else {
          const existingEn = await prisma.campaignTranslation.findFirst({
            where: { campaignId: id, locale: "en" },
            select: { title: true },
          });
          base = existingEn?.title?.trim() || existingCampaign.title;
        }
      }
      updateData.slug = await generateUniqueSlug(prisma.campaign as any, base, {
        fallbackPrefix: "campaign",
        currentId: id,
      });
    }

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

    // ✅ STEP 4: Execute update in transaction (higher timeout: default 5s is too low for
    // cold DB / many locales; parallel upserts reduce wall time)
    const updatedCampaign = await prisma.$transaction(
      async (tx) => {
        const campaign = await tx.campaign.update({
          where: { id },
          data: updateData,
        });

        // Process upserts sequentially because the locale-slug uniqueness check inside
        // generateUniqueLocaleSlug must see prior writes within this transaction.
        for (const { locale, data } of translationUpdates) {
          const translationData: Record<string, string | null> = {};
          if (data.title !== undefined) translationData.title = data.title;
          if (data.description !== undefined)
            translationData.description = data.description;
          if (data.image !== undefined) {
            translationData.image =
              typeof data.image === "string" && data.image.trim() ? data.image.trim() : null;
          }
          if (data.videoUrl !== undefined) {
            translationData.videoUrl =
              typeof data.videoUrl === "string" && data.videoUrl.trim()
                ? data.videoUrl.trim()
                : null;
          }
          // Optional per-locale slug: when caller passes an explicit slug we normalize +
          // dedupe; when it's omitted we leave the existing one alone; when it's
          // explicitly nulled we clear it.
          let resolvedSlug: string | null | undefined;
          if (Object.prototype.hasOwnProperty.call(data, "slug")) {
            const userSlug = normalizeUserSlug((data as Record<string, unknown>).slug);
            if (userSlug === null) {
              resolvedSlug = null;
            } else {
              const existingTrans = await tx.campaignTranslation.findUnique({
                where: { campaignId_locale: { campaignId: id, locale } },
                select: { id: true },
              });
              resolvedSlug = await generateUniqueLocaleSlug(
                tx.campaignTranslation as any,
                userSlug,
                {
                  locale,
                  fallbackPrefix: "campaign",
                  currentTranslationId: existingTrans?.id,
                }
              );
            }
            translationData.slug = resolvedSlug;
          }
          if (Object.keys(translationData).length === 0) continue;
          // Skip only when nothing meaningful was supplied.
          if (
            !translationData.title &&
            !translationData.description &&
            !translationData.image &&
            !translationData.videoUrl &&
            !translationData.slug
          )
            continue;
          // upsert.create requires title + description (NOT NULL); fall back to empty strings so
          // an image/video/slug-only update still creates the row.
          const createData = {
            ...translationData,
            title: typeof translationData.title === "string" ? translationData.title : "",
            description:
              typeof translationData.description === "string" ? translationData.description : "",
          };
          await tx.campaignTranslation.upsert({
            where: {
              campaignId_locale: {
                campaignId: id,
                locale,
              },
            },
            update: translationData,
            create: {
              campaign: { connect: { id } },
              locale,
              ...createData,
            },
          });
        }

        return campaign;
      },
      { maxWait: 10_000, timeout: 60_000 }
    );

    // ✅ STEP 5: Fetch updated campaign with all translations
    const fullCampaign = await prisma.campaign.findUnique({
      where: { id },
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
      },
    });

    const actor = session!.user;
    const t = fullCampaign?.title ?? body.title ?? "مشروع";
    await writeAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role ?? "ADMIN",
      action: "CAMPAIGN_UPDATE",
      messageAr: `${actor.name ?? "مسؤول"} عدّل المشروع: ${t}`,
      messageEn: `${actor.name ?? "Admin"} updated campaign ${t}`,
      entityType: "Campaign",
      entityId: id,
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'campaigns');
    if (denied) return denied;

    const { id: idOrSlug } = await params;

    // Ensure campaign exists (param may be id, base slug, or per-locale slug)
    const camp = await prisma.campaign.findFirst({
      where: whereByIdOrLocaleSlug(idOrSlug, "ar"),
      select: { id: true, title: true },
    });
    if (!camp) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    const id = camp.id;

    // Check for donations
    const donationCount = await prisma.donationItem.count({ where: { campaignId: id } });
    const force = request.nextUrl.searchParams.get('force') === 'true';
    if (donationCount > 0 && !force) {
      return NextResponse.json({ error: 'Campaign has donations. Use force=true to remove donation items and delete the campaign.' }, { status: 400 });
    }

    // Safe delete: run each cleanup step outside a single transaction to avoid
    // the 5 s interactive-transaction timeout on large datasets.
    if (donationCount > 0 && force) {
      await prisma.donationItem.deleteMany({ where: { campaignId: id } });

      // Remove donations that now have no items at all
      const orphanDonations = await prisma.donation.findMany({
        where: { items: { none: {} }, categoryItems: { none: {} } },
        select: { id: true },
      });
      if (orphanDonations.length > 0) {
        await prisma.donation.deleteMany({
          where: { id: { in: orphanDonations.map((d) => d.id) } },
        });
      }
    }

    await prisma.update.deleteMany({ where: { campaignId: id } });
    await prisma.campaignTranslation.deleteMany({ where: { campaignId: id } });
    await prisma.comment.deleteMany({ where: { campaignId: id } });
    await prisma.cartItem.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    const actor = session!.user;
    await writeAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role ?? "ADMIN",
      action: "CAMPAIGN_DELETE",
      messageAr: `${actor.name ?? "مسؤول"} حذف المشروع: ${camp.title}`,
      entityType: "Campaign",
      entityId: id,
    });

    return NextResponse.json({ message: 'تم مسح المشروع' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}

// ✅ Next.js ISR: Regenerate every 5 minutes
export const revalidate = 300;