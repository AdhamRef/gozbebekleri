import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

function getDateRange(period: string, startParam?: string | null, endParam?: string | null) {
  let endDate: Date;
  let startDate: Date;
  if (startParam && endParam) {
    startDate = new Date(startParam + "T00:00:00.000Z");
    endDate = new Date(endParam + "T23:59:59.999Z");
  } else if (period === "all") {
    endDate = new Date();
    startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 10);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    endDate = endParam ? new Date(endParam + "T23:59:59.999Z") : new Date();
    startDate = new Date(endDate);
    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
}

function buildDonationWhere(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.DonationWhereInput {
  const base: Prisma.DonationWhereInput = {
    subscriptionId: { not: null },
    createdAt: { gte: startDate, lte: endDate },
  };
  if (referralId) base.referralId = referralId;
  if (campaignId && campaignId !== "all") {
    base.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    base.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  return base;
}

function buildDonationWhereAllTime(
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.DonationWhereInput {
  const base: Prisma.DonationWhereInput = { subscriptionId: { not: null } };
  if (referralId) base.referralId = referralId;
  if (campaignId && campaignId !== "all") {
    base.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    base.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  return base;
}

function buildSubscriptionWhere(
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.SubscriptionWhereInput {
  const campaignCat: Prisma.SubscriptionWhereInput = {};
  if (campaignId && campaignId !== "all") {
    campaignCat.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    campaignCat.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  if (referralId && Object.keys(campaignCat).length > 0) {
    return { AND: [{ referralId }, campaignCat] };
  }
  if (referralId) return { referralId };
  return campaignCat;
}

function buildDonationItemWhereSub(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.DonationItemWhereInput {
  const donation: Prisma.DonationWhereInput = {
    subscriptionId: { not: null },
    createdAt: { gte: startDate, lte: endDate },
  };
  if (referralId) donation.referralId = referralId;
  if (campaignId && campaignId !== "all") {
    donation.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    donation.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  if (campaignId && campaignId !== "all") {
    return { donation, campaignId };
  }
  if (categoryId && categoryId !== "all") {
    return { donation, campaign: { categoryId } };
  }
  return { donation };
}

function buildDonationCategoryItemWhereSub(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  referralId: string | null
): Prisma.DonationCategoryItemWhereInput {
  const donation: Prisma.DonationWhereInput = {
    subscriptionId: { not: null },
    createdAt: { gte: startDate, lte: endDate },
  };
  if (referralId) donation.referralId = referralId;
  if (categoryId && categoryId !== "all") {
    donation.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
    return { donation, categoryId };
  }
  return { donation };
}

/** GET /api/admin/subscriptions/stats — monthly subscriptions + donations from subscriptions */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const categoryId = searchParams.get("categoryId");
    const campaignId = searchParams.get("campaignId");
    const referralIdParam = searchParams.get("referralId");

    let referralId: string | null = null;
    if (referralIdParam) {
      const ref = await prisma.referral.findUnique({
        where: { id: referralIdParam },
        select: { id: true },
      });
      if (!ref) {
        return NextResponse.json({ error: "Referral not found" }, { status: 404 });
      }
      referralId = ref.id;
    }

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const subBase = buildSubscriptionWhere(categoryId, campaignId, referralId);
    const donationWhere = buildDonationWhere(startDate, endDate, categoryId, campaignId, referralId);
    const donationWhereAllTime = buildDonationWhereAllTime(categoryId, campaignId, referralId);

    const last30End = new Date();
    last30End.setUTCHours(23, 59, 59, 999);
    const last30Start = new Date(last30End);
    last30Start.setUTCDate(last30Start.getUTCDate() - 30);
    last30Start.setUTCHours(0, 0, 0, 0);
    const last30Where: Prisma.DonationWhereInput = {
      ...donationWhere,
      createdAt: { gte: last30Start, lte: last30End },
    };

    const [
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      totalAmountResult,
      last30TotalResult,
      allTimeRevenueResult,
      campaignDonationsSum,
      categoryDonationsSum,
      recentDonations,
      activeSubscriptionCount,
      pausedSubscriptionCount,
      cancelledSubscriptionCount,
      monthlyRecurringRevenueResult,
      pausedAmountResult,
      cancelledAmountResult,
      newSubscriptionsInPeriod,
      totalSubscriptionsMatching,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: last30Where,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationWhereAllTime,
      }),
      prisma.donationItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationItemWhereSub(startDate, endDate, categoryId, campaignId, referralId),
      }),
      prisma.donationCategoryItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationCategoryItemWhereSub(startDate, endDate, categoryId, referralId),
      }),
      prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: donationWhere,
        select: {
          id: true,
          amount: true,
          totalAmount: true,
          amountUSD: true,
          createdAt: true,
          currency: true,
          subscriptionId: true,
          donor: { select: { name: true } },
          items: { select: { campaign: { select: { title: true } } } },
          categoryItems: { select: { category: { select: { name: true } } } },
        },
      }),
      prisma.subscription.count({ where: { ...subBase, status: "ACTIVE" } }),
      prisma.subscription.count({ where: { ...subBase, status: "PAUSED" } }),
      prisma.subscription.count({ where: { ...subBase, status: "CANCELLED" } }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subBase, status: "ACTIVE" },
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subBase, status: "PAUSED" },
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subBase, status: "CANCELLED" },
      }),
      prisma.subscription.count({
        where: { ...subBase, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.subscription.count({ where: subBase }),
    ]);

    const totalAmount = totalAmountResult._sum?.amountUSD ?? 0;
    const thisMonthRevenue = last30TotalResult._sum?.amountUSD ?? 0;
    const allTimeRevenue = allTimeRevenueResult._sum?.amountUSD ?? 0;
    const monthlyRecurringRevenue = monthlyRecurringRevenueResult._sum?.amountUSD ?? 0;
    const activeMonthlyAmountUSD = monthlyRecurringRevenue;
    const pausedSubscriptionAmountUSD = pausedAmountResult._sum?.amountUSD ?? 0;
    const cancelledSubscriptionAmountUSD = cancelledAmountResult._sum?.amountUSD ?? 0;
    const monthlyStoppedAmountUSD = pausedSubscriptionAmountUSD + cancelledSubscriptionAmountUSD;

    const campaignDonationsTotal =
      campaignDonationsSum._sum?.amountUSD ?? campaignDonationsSum._sum?.amount ?? 0;
    const categoryDonationsTotal =
      categoryDonationsSum._sum?.amountUSD ?? categoryDonationsSum._sum?.amount ?? 0;
    const campaignDonationsCount = campaignDonationsSum._count?.id ?? 0;
    const categoryDonationsCount = categoryDonationsSum._count?.id ?? 0;

    const donationsForSupportFees = await prisma.donation.findMany({
      where: donationWhere,
      select: { amountUSD: true, totalAmount: true, teamSupport: true, fees: true },
      take: 100000,
    });
    const toUSD = (
      rows: { amountUSD: number | null; totalAmount: number; teamSupport?: number | null; fees?: number | null }[]
    ) =>
      rows.reduce(
        (acc, r) => {
          const usd = r.amountUSD ?? 0;
          const total = r.totalAmount || 1;
          acc.teamSupport += usd * ((r.teamSupport ?? 0) / total);
          acc.fees += usd * ((r.fees ?? 0) / total);
          return acc;
        },
        { teamSupport: 0, fees: 0 }
      );
    const { teamSupport: teamSupportTotal, fees: feesTotal } = toUSD(donationsForSupportFees);

    const recentDonationsList = Array.isArray(recentDonations) ? recentDonations : [];
    const recentDonationsFormatted = recentDonationsList.map((d) => ({
      id: d.id,
      amount: d.totalAmount ?? d.amount ?? 0,
      currency: d.currency ?? "USD",
      donorName: d.donor?.name ?? "—",
      type: "MONTHLY" as const,
      campaignTitle: d.items?.[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems?.[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      totalAmount,
      allTimeRevenue,
      thisMonthRevenue,
      monthlyRecurringRevenue,
      activeMonthlyAmountUSD,
      monthlyStoppedAmountUSD,
      pausedSubscriptionAmountUSD,
      cancelledSubscriptionAmountUSD,
      activeMonthlyCount: activeSubscriptionCount,
      pausedSubscriptionCount,
      cancelledSubscriptionCount,
      monthlyStoppedCount: pausedSubscriptionCount + cancelledSubscriptionCount,
      newSubscriptionsInPeriod,
      totalSubscriptionsMatching,
      monthlyCount: totalDonations,
      oneTimeCount: 0,
      oneTimeTotalAmount: 0,
      monthlyTotalAmount: totalAmount,
      campaignDonationsTotal,
      categoryDonationsTotal,
      campaignDonationsCount,
      categoryDonationsCount,
      teamSupportTotal,
      feesTotal,
      recentDonations: recentDonationsFormatted,
    });
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch subscription statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
