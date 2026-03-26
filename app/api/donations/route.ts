import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { resolveReferralId } from "@/lib/referral-server";

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
    const referralId = searchParams.get("referralId");
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

    const isAdmin = session.user.role === "ADMIN";
    const subscriptionOnly =
      isAdmin &&
      (searchParams.get("subscriptionOnly") === "true" || searchParams.get("subscriptionOnly") === "1");

    const where: Record<string, unknown> = {
      ...(campaignId && { items: { some: { campaignId } } }),
      ...(userId && { donorId: userId }),
      ...(referralId && isAdmin && { referralId }),
      ...(subscriptionOnly && { subscriptionId: { not: null } }),
      ...(!isAdmin && { donorId: session.user.id }),
      ...(search && isAdmin && { donor: { name: { contains: search } } }),
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };
    if (categoryId && isAdmin) {
      where.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    const orderBy =
      sortBy === "amount"
        ? { amountUSD: sortOrder }
        : { createdAt: sortOrder };

    const total = await prisma.donation.count({ where });
    const donations = await prisma.donation.findMany({
      where,
      include: {
        donor: { select: { id: true, name: true, email: true, image: true } },
        items: { include: { campaign: { select: { id: true, title: true, images: true } } } },
        categoryItems: { include: { category: { select: { id: true, name: true } } } },
        comments: { orderBy: { createdAt: "desc" }, take: 1 },
        referral: { select: { id: true, code: true, name: true } },
      },
      orderBy,
      skip,
      take: limit,
    });
    const formattedDonations = donations.map((donation) => ({
      ...donation,
      type: donation.subscriptionId ? ("MONTHLY" as const) : ("ONE_TIME" as const),
      fees: donation.fees,
      teamSupport: donation.teamSupport,
      donor: donation.donor,
      campaigns: donation.items.map((item) => ({ id: item.campaign.id, title: item.campaign.title, images: item.campaign.images })),
      categories: (donation.categoryItems ?? []).map((ci) => ({ id: ci.category.id, name: ci.category.name })),
      referral: donation.referral ? { id: donation.referral.id, code: donation.referral.code, name: donation.referral.name } : null,
    }));
    return NextResponse.json({
      donations: formattedDonations,
      pagination: { total, pages: Math.ceil(total / limit), page, limit },
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
      items,
      categoryItems,
      currency,
      teamSupport = 0,
      coverFees = false,
      type = "ONE_TIME",
      billingDay = null,
      paymentMethod,
      cardDetails = null,
      referralCode,
      referralId: bodyReferralId,
      locale: donationLocale,
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

    // Accept either referralId (MongoDB id) or referralCode (string code); validate and use one.
    let referralId: string | null = null;
    if (bodyReferralId && typeof bodyReferralId === "string" && bodyReferralId.trim()) {
      const ref = await prisma.referral.findUnique({
        where: { id: bodyReferralId.trim() },
        select: { id: true },
      });
      referralId = ref?.id ?? null;
    }
    if (referralId == null) {
      referralId = await resolveReferralId(referralCode);
    }

    const validLocale =
      donationLocale && ["ar", "en", "fr", "tr", "id", "pt", "es"].includes(String(donationLocale).toLowerCase())
        ? String(donationLocale).toLowerCase()
        : null;

    if (type === "MONTHLY") {
      // Monthly: create Subscription + first Donation (transaction) linked to it
      const subscription = await prisma.$transaction(async (tx) => {
        const nextBilling = new Date();
        nextBilling.setUTCMonth(nextBilling.getUTCMonth() + 1);
        nextBilling.setUTCHours(0, 0, 0, 0);

        const sub = await tx.subscription.create({
          data: {
            status: "ACTIVE",
            billingDay: billingDay ?? undefined,
            amount: totalAmount,
            amountUSD: totalAmountUSD,
            currency,
            teamSupport,
            coverFees,
            paymentMethod,
            cardDetails: paymentMethod === "CARD" ? cardDetails : null,
            donorId: session.user.id,
            referralId: referralId ?? undefined,
            nextBillingDate: nextBilling,
            lastBillingDate: new Date(),
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
          include: { items: true, categoryItems: true },
        });

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
            referralId: referralId ?? undefined,
            subscriptionId: sub.id,
            paymentMethod,
            cardDetails: paymentMethod === "CARD" ? cardDetails : null,
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

        if (validLocale) {
          const donor = await tx.user.findUnique({
            where: { id: session.user.id },
            select: { preferredLang: true },
          });
          if (donor && donor.preferredLang == null) {
            await tx.user.update({
              where: { id: session.user.id },
              data: { preferredLang: validLocale },
            });
          }
        }

        return { subscription: sub, donation };
      }, { timeout: 15000 });

      return NextResponse.json({
        success: true,
        subscription: subscription.subscription,
        donation: subscription.donation,
      });
    }

    // One-time: create a single Donation (transaction) only
    const donation = await prisma.$transaction(async (tx) => {
      const d = await tx.donation.create({
        data: {
          amount: totalAmount,
          amountUSD: totalAmountUSD,
          teamSupport,
          coverFees,
          currency,
          fees: coverFees ? fees : 0,
          totalAmount: finalTotalAmount,
          donorId: session.user.id,
          referralId: referralId ?? undefined,
          paymentMethod,
          cardDetails: paymentMethod === "CARD" ? cardDetails : null,
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

      if (validLocale) {
        const donor = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { preferredLang: true },
        });
        if (donor && donor.preferredLang == null) {
          await tx.user.update({
            where: { id: session.user.id },
            data: { preferredLang: validLocale },
          });
        }
      }

      return d;
    }, { timeout: 15000 });

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