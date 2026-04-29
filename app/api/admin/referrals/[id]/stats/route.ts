import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCalendarMonthUtcRange } from "@/lib/admin/current-calendar-month-utc";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  PAID_DONATION_FILTER,
  donationRowUsdApprox,
  donationUsdRevenueFallback,
  donationUsdSumFallback,
} from "@/lib/dashboard/donation-usd-revenue";

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

/** GET /api/admin/referrals/[id]/stats - Stats for donations (transactions) and subscriptions attributed to this referral */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "referrals");
    if (denied) return denied;
    const { id: referralId } = await params;
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { id: true, code: true, name: true },
    });
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const categoryId = searchParams.get("categoryId");
    const campaignId = searchParams.get("campaignId");

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const donationWhere: Prisma.DonationWhereInput = {
      referralId,
      createdAt: { gte: startDate, lte: endDate },
    };
    /** Same category/campaign filters as donationWhere, but no date — for all-time إيرادات card */
    const allTimeDonationWhere: Prisma.DonationWhereInput = { referralId };
    if (campaignId && campaignId !== "all") {
      donationWhere.items = { some: { campaignId } };
      allTimeDonationWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== "all") {
      donationWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
      allTimeDonationWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    // status=PAID alone includes abandoned checkouts that never settled; require paidAt too.
    const paidDonationWhere: Prisma.DonationWhereInput = { ...donationWhere, ...PAID_DONATION_FILTER };
    const failedDonationWhere: Prisma.DonationWhereInput = { ...donationWhere, status: "FAILED" };
    const oneTimeWhere = { ...paidDonationWhere, subscriptionId: null };
    const fromSubscriptionWhere = { ...paidDonationWhere, subscriptionId: { not: null } };

    const subscriptionWhere: Prisma.SubscriptionWhereInput = { referralId };
    if (campaignId && campaignId !== "all") {
      subscriptionWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== "all") {
      subscriptionWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    const { monthStart, monthEnd } = getCurrentCalendarMonthUtcRange();
    const thisMonthDonationWhere: Prisma.DonationWhereInput = {
      referralId,
      createdAt: { gte: monthStart, lte: monthEnd },
    };
    if (campaignId && campaignId !== "all") {
      thisMonthDonationWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== "all") {
      thisMonthDonationWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }
    const thisMonthPaidWhere: Prisma.DonationWhereInput = { ...thisMonthDonationWhere, ...PAID_DONATION_FILTER };
    const allTimePaidWhere: Prisma.DonationWhereInput = { ...allTimeDonationWhere, ...PAID_DONATION_FILTER };

    const [
      totalDonations,
      paidDonationCount,
      failedDonationCount,
      oneTimeCount,
      fromSubscriptionCount,
      activeSubscriptionCount,
      stoppedSubscriptionCount,
      monthlyRecurringRevenueResult,
      monthlyStoppedAmountResult,
      oneTimeTotalResult,
      fromSubscriptionTotalResult,
      thisMonthTotalResult,
      allTimeRevenueResult,
      failedTotalResult,
      campaignDonationsSum,
      categoryDonationsSum,
      recentDonations,
    ] = await Promise.all([
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.count({ where: paidDonationWhere }),
      prisma.donation.count({ where: failedDonationWhere }),
      prisma.donation.count({ where: oneTimeWhere }),
      prisma.donation.count({ where: fromSubscriptionWhere }),
      prisma.subscription.count({ where: { ...subscriptionWhere, status: "ACTIVE" } }),
      prisma.subscription.count({
        where: { ...subscriptionWhere, status: { in: ["PAUSED", "CANCELLED"] } },
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subscriptionWhere, status: "ACTIVE" },
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subscriptionWhere, status: { in: ["PAUSED", "CANCELLED"] } },
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: oneTimeWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: fromSubscriptionWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: thisMonthPaidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: allTimePaidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: failedDonationWhere,
      }),
      prisma.donationItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: { donation: paidDonationWhere },
      }),
      prisma.donationCategoryItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: { donation: paidDonationWhere },
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
          status: true,
          donor: { select: { name: true } },
          items: { select: { campaign: { select: { title: true } } } },
          categoryItems: { select: { category: { select: { name: true } } } },
        },
      }),
    ]);

    let oneTimeTotalAmount = oneTimeTotalResult._sum?.amountUSD ?? 0;
    let fromSubscriptionTotalAmount = fromSubscriptionTotalResult._sum?.amountUSD ?? 0;
    let totalAmount = oneTimeTotalAmount + fromSubscriptionTotalAmount;
    if (totalAmount === 0 && paidDonationCount > 0) {
      const fb = await donationUsdRevenueFallback(paidDonationWhere);
      oneTimeTotalAmount = fb.oneTime;
      fromSubscriptionTotalAmount = fb.monthly;
      totalAmount = fb.total;
    }

    const monthlyRecurringRevenue = monthlyRecurringRevenueResult._sum?.amountUSD ?? 0;
    const activeMonthlyAmountUSD = monthlyRecurringRevenue;
    const monthlyStoppedAmountUSD = monthlyStoppedAmountResult._sum?.amountUSD ?? 0;
    let thisMonthRevenue = thisMonthTotalResult._sum?.amountUSD ?? 0;
    if (thisMonthRevenue === 0) {
      const paidThisMonth = await prisma.donation.count({ where: thisMonthPaidWhere });
      if (paidThisMonth > 0) {
        thisMonthRevenue = await donationUsdSumFallback(thisMonthPaidWhere);
      }
    }
    let allTimeRevenue = allTimeRevenueResult._sum?.amountUSD ?? 0;
    if (allTimeRevenue === 0) {
      const allTimePaidCount = await prisma.donation.count({ where: allTimePaidWhere });
      if (allTimePaidCount > 0) {
        allTimeRevenue = await donationUsdSumFallback(allTimePaidWhere);
      }
    }
    const campaignDonationsTotal = campaignDonationsSum._sum?.amountUSD ?? campaignDonationsSum._sum?.amount ?? 0;
    const categoryDonationsTotal = categoryDonationsSum._sum?.amountUSD ?? categoryDonationsSum._sum?.amount ?? 0;
    const campaignDonationsCount = campaignDonationsSum._count?.id ?? 0;
    const categoryDonationsCount = categoryDonationsSum._count?.id ?? 0;

    const donationsForSupportFees = await prisma.donation.findMany({
      where: paidDonationWhere,
      select: { amountUSD: true, amount: true, currency: true, totalAmount: true, teamSupport: true, fees: true },
      take: 100000,
    });
    const toUSD = (
      rows: {
        amountUSD: number | null;
        amount: number;
        currency: string;
        totalAmount: number;
        teamSupport?: number | null;
        fees?: number | null;
      }[]
    ) =>
      rows.reduce(
        (acc, r) => {
          const usd = donationRowUsdApprox(r);
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
      type: d.subscriptionId ? ("MONTHLY" as const) : ("ONE_TIME" as const),
      status: d.status,
      campaignTitle: d.items?.[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems?.[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    const failedTotalAmount = failedTotalResult._sum?.amountUSD ?? 0;

    /** All-time successful revenue for this referral — ignores category/campaign filters */
    const referralAllTimePaidWhere: Prisma.DonationWhereInput = { referralId, ...PAID_DONATION_FILTER };
    let paidRevenueAllTimeUnfiltered =
      (await prisma.donation.aggregate({ _sum: { amountUSD: true }, where: referralAllTimePaidWhere }))._sum
        ?.amountUSD ?? 0;
    if (paidRevenueAllTimeUnfiltered === 0) {
      const n = await prisma.donation.count({ where: referralAllTimePaidWhere });
      if (n > 0) paidRevenueAllTimeUnfiltered = await donationUsdSumFallback(referralAllTimePaidWhere);
    }

    return NextResponse.json({
      referral: { id: referral.id, code: referral.code, name: referral.name },
      totalCampaigns: 0,
      totalCategories: 0,
      totalDonations,
      paidCount: paidDonationCount,
      failedCount: failedDonationCount,
      failedTotalAmount,
      totalUsers: 0,
      totalAmount,
      allTimeRevenue,
      paidRevenueAllTimeUnfiltered,
      oneTimeCount,
      monthlyCount: fromSubscriptionCount,
      activeMonthlyCount: activeSubscriptionCount,
      monthlyStoppedCount: stoppedSubscriptionCount,
      monthlyRecurringRevenue,
      activeMonthlyAmountUSD,
      monthlyStoppedAmountUSD,
      thisMonthRevenue,
      oneTimeTotalAmount,
      monthlyTotalAmount: fromSubscriptionTotalAmount,
      campaignDonationsTotal,
      categoryDonationsTotal,
      campaignDonationsCount,
      categoryDonationsCount,
      teamSupportTotal,
      feesTotal,
      recentDonations: recentDonationsFormatted,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch referral statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
