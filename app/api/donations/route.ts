import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

// GET /api/donations - Get all donations (admin) or user's donations
// GET /api/donations - Get all donations (admin) or user's donations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search")?.trim();
    const startParam = searchParams.get("start"); // YYYY-MM-DD
    const endParam = searchParams.get("end"); // YYYY-MM-DD
    const sortBy = (searchParams.get("sortBy") || "date") as "date" | "amount";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10") || 10, 100);
    const skip = (page - 1) * limit;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startParam) dateFilter.gte = new Date(startParam + "T00:00:00.000Z");
    if (endParam) dateFilter.lte = new Date(endParam + "T23:59:59.999Z");

    const where: Record<string, unknown> = {
      ...(campaignId && { items: { some: { campaignId } } }),
      ...(userId && { donorId: userId }),
      ...(session.user.role !== "ADMIN" && { donorId: session.user.id }),
      ...(search && session.user.role === "ADMIN" && {
        donor: {
          name: { contains: search },
        },
      }),
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };
    if (categoryId && session.user.role === "ADMIN") {
      where.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    // Sort by amount uses amountUSD only (USD) for consistent comparison
    const orderBy =
      sortBy === "amount"
        ? { amountUSD: sortOrder }
        : { createdAt: sortOrder };

    const total = await prisma.donation.count({ where });

    const donations = await prisma.donation.findMany({
      where,
      include: {

        donor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
        },
        categoryItems: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    const formattedDonations = donations.map((donation) => ({
      ...donation,
      fees: donation.fees,
      teamSupport: donation.teamSupport,
      donor: {
        id: donation.donor.id,
        name: donation.donor.name,
        email: donation.donor.email,
        image: donation.donor.image,
      },
      campaigns: donation.items.map((item) => ({
        id: item.campaign.id,
        title: item.campaign.title,
        images: item.campaign.images,
      })),
      categories: donation.categoryItems?.map((ci) => ({
        id: ci.category.id,
        name: ci.category.name,
      })) ?? [],
    }));

    return NextResponse.json({
      donations: formattedDonations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}

// POST /api/donations - Create a new donation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      items, // Array of { campaignId, amount, amountUSD }
      categoryItems, // Array of { categoryId, amount, amountUSD }
      currency,
      teamSupport = 0,
      coverFees = false,
      type = "ONE_TIME",
      billingDay = null,
      paymentMethod,
      cardDetails = null,
    } = body;

    const hasCampaignItems = items?.length > 0;
    const hasCategoryItems = categoryItems?.length > 0;

    // Validate: need at least one of items or categoryItems
    if ((!hasCampaignItems && !hasCategoryItems) || !currency || !paymentMethod) {
      return NextResponse.json(
        { error: "Items or categoryItems, currency, and payment method are required" },
        { status: 400 }
      );
    }

    // Validate card details
    if (
      paymentMethod === "CARD" &&
      (!cardDetails?.cardNumber ||
        !cardDetails.expiryDate ||
        !cardDetails.cvv ||
        !cardDetails.cardholderName)
    ) {
      return NextResponse.json(
        { error: "Card details are required for card payments" },
        { status: 400 }
      );
    }

    // Calculate totals from both items and categoryItems
    const campaignTotal = hasCampaignItems ? items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) : 0;
    const categoryTotal = hasCategoryItems ? categoryItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) : 0;
    const totalAmount = campaignTotal + categoryTotal;
    const campaignTotalUSD = hasCampaignItems ? items.reduce((sum: number, item: { amountUSD?: number }) => sum + (item.amountUSD || 0), 0) : 0;
    const categoryTotalUSD = hasCategoryItems ? categoryItems.reduce((sum: number, item: { amountUSD?: number }) => sum + (item.amountUSD || 0), 0) : 0;
    const totalAmountUSD = campaignTotalUSD + categoryTotalUSD;
    const fees = (totalAmount + teamSupport) * 0.03;
    const finalTotalAmount = totalAmount + teamSupport + (coverFees ? fees : 0);

    // Verify all campaigns exist and are active (if any)
    if (hasCampaignItems) {
      const campaignIds = items.map((item: { campaignId: string }) => item.campaignId);
      const campaigns = await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
      });
      if (campaigns.length !== items.length) {
        return NextResponse.json(
          { error: "One or more campaigns not found" },
          { status: 404 }
        );
      }
      if (campaigns.some((c) => !c.isActive)) {
        return NextResponse.json(
          { error: "One or more campaigns are not active" },
          { status: 400 }
        );
      }
    }

    // Verify all categories exist (if any)
    if (hasCategoryItems) {
      const categoryIds = categoryItems.map((item: { categoryId: string }) => item.categoryId);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });
      if (categories.length !== categoryItems.length) {
        return NextResponse.json(
          { error: "One or more categories not found" },
          { status: 404 }
        );
      }
    }

    // Create donation and items in a transaction
    const donation = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          amount: totalAmount,
          amountUSD: totalAmountUSD,
          teamSupport,
          coverFees,
          currency,
          fees: coverFees ? fees : 0,
          totalAmount: finalTotalAmount,
          donorId: session.user.id,
          type: type as "ONE_TIME" | "MONTHLY",
          status: "ACTIVE",
          paymentMethod,
          cardDetails: paymentMethod === "CARD" ? cardDetails : null,
          billingDay: type === "MONTHLY" ? billingDay : null,
          lastBillingDate: type === "MONTHLY" ? new Date() : null,
          nextBillingDate:
            type === "MONTHLY"
              ? new Date(new Date().setMonth(new Date().getMonth() + 1))
              : null,
          items: hasCampaignItems
            ? {
                create: items.map((item: { campaignId: string; amount: number; amountUSD?: number }) => ({
                  campaignId: item.campaignId,
                  amount: item.amount,
                  amountUSD: item.amountUSD,
                })),
              }
            : undefined,
          categoryItems: hasCategoryItems
            ? {
                create: categoryItems.map((item: { categoryId: string; amount: number; amountUSD?: number }) => ({
                  categoryId: item.categoryId,
                  amount: item.amount,
                  amountUSD: item.amountUSD,
                })),
              }
            : undefined,
        },
        include: {
          donor: { select: { name: true, email: true } },
          items: { include: { campaign: { select: { title: true } } } },
          categoryItems: { include: { category: { select: { name: true } } } },
        },
      });

      for (const item of hasCampaignItems ? items : []) {
        await tx.campaign.update({
          where: { id: item.campaignId },
          data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
        });
      }
      for (const item of hasCategoryItems ? categoryItems : []) {
        await tx.category.update({
          where: { id: item.categoryId },
          data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
        });
      }

      return donation;
    });

    return NextResponse.json({
      success: true,
      donation,
    });
  } catch (error) {
    console.error("Error creating donation:", error);
    return NextResponse.json(
      { error: "Failed to create donation" },
      { status: 500 }
    );
  }
}