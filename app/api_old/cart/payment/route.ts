import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import useConvetToUSD from "@/hooks/useConvetToUSD";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where = {
      ...(campaignId && { campaignId }),
      ...(userId && { donorId: userId }),
      // If not admin, only show user's own donations
      ...(!session.user.role === "ADMIN" && { donorId: session.user.id }),
    };

    // Get total count for pagination
    const total = await prisma.donation.count({ where });

    // Get donations with pagination
    const donations = await prisma.donation.findMany({
      where,
      include: {
        donor: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                images: true,
              },
            },
          },
        },
        Comment: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      donations,
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
      currency,
      teamSupport = 0,
      coverFees = false,
      type = "ONE_TIME",
      billingDay = null,
      paymentMethod,
      cardDetails = null,
    } = body;

    // Validate required fields
    if (!items?.length || !currency || !paymentMethod) {
      return NextResponse.json(
        { error: "Items, currency, and payment method are required" },
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

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmountUSD = items.reduce(
      (sum, item) => sum + (item.amountUSD || 0),
      0
    );
    const fees = (totalAmount + teamSupport) * 0.03;
    const finalTotalAmount = totalAmount + teamSupport + (coverFees ? fees : 0);

    // Verify all campaigns exist and are active
    const campaignIds = items.map((item) => item.campaignId);
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
    });

    if (campaigns.length !== items.length) {
      return NextResponse.json(
        { error: "One or more campaigns not found" },
        { status: 404 }
      );
    }

    if (campaigns.some((campaign) => !campaign.isActive)) {
      return NextResponse.json(
        { error: "One or more campaigns are not active" },
        { status: 400 }
      );
    }

    // Create donation and items in a transaction
    const donation = await prisma.$transaction(async (prisma) => {
      // Create main donation
      const donation = await prisma.donation.create({
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
          // Create donation items
          items: {
            create: items.map((item) => ({
              campaignId: item.campaignId,
              amount: item.amount,
              amountUSD: item.amountUSD,
            })),
          },
        },
        include: {
          donor: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              campaign: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      // Update campaign amounts
      for (const item of items) {
        await prisma.campaign.update({
          where: { id: item.campaignId },
          data: {
            currentAmount: {
              increment: item.amountUSD || 0,
            },
          },
        });
      }

      // Clear the user's cart
      await prisma.cartItem.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

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
