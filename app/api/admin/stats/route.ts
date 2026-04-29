import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentCalendarMonthUtcRange } from '@/lib/admin/current-calendar-month-utc';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';
import {
  PAID_DONATION_FILTER,
  donationRowUsdApprox,
  donationUsdRevenueFallback,
  donationUsdSumFallback,
} from '@/lib/dashboard/donation-usd-revenue';

function getDateRange(period: string, startParam?: string | null, endParam?: string | null) {
  let endDate: Date;
  let startDate: Date;
  if (startParam && endParam) {
    startDate = new Date(startParam + 'T00:00:00.000Z');
    endDate = new Date(endParam + 'T23:59:59.999Z');
  } else if (period === 'all') {
    endDate = new Date();
    startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 10);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    endDate = endParam ? new Date(endParam + 'T23:59:59.999Z') : new Date();
    startDate = new Date(endDate);
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
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
  campaignId: string | null
) {
  const dateFilter = { createdAt: { gte: startDate, lte: endDate } };
  const base: Record<string, unknown> = { ...dateFilter };
  if (campaignId && campaignId !== 'all') {
    base.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== 'all') {
    base.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  return base;
}

/** Same filters as buildDonationWhere but no date — all-time إيرادات (donation amountUSD sum) */
function buildDonationWhereAllTime(categoryId: string | null, campaignId: string | null) {
  const base: Record<string, unknown> = {};
  if (campaignId && campaignId !== 'all') {
    base.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== 'all') {
    base.OR = [
      { items: { some: { campaign: { categoryId } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  return base;
}

function buildDonationItemWhere(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null
) {
  const base: Record<string, unknown> = {
    donation: { createdAt: { gte: startDate, lte: endDate }, ...PAID_DONATION_FILTER },
  };
  if (campaignId && campaignId !== 'all') {
    base.campaignId = campaignId;
  } else if (categoryId && categoryId !== 'all') {
    base.campaign = { categoryId };
  }
  return base;
}

function buildDonationCategoryItemWhere(
  startDate: Date,
  endDate: Date,
  categoryId: string | null
) {
  const base: Record<string, unknown> = {
    donation: { createdAt: { gte: startDate, lte: endDate }, ...PAID_DONATION_FILTER },
  };
  if (categoryId && categoryId !== 'all') {
    base.categoryId = categoryId;
  }
  return base;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'revenue');
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const categoryId = searchParams.get('categoryId');
    const campaignId = searchParams.get('campaignId');

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const donationWhere = buildDonationWhere(startDate, endDate, categoryId, campaignId);
    const donationWhereAllTime = buildDonationWhereAllTime(categoryId, campaignId);

    // Only donations that actually settled (status=PAID + paidAt set) count toward revenue.
    // status=PAID alone includes abandoned checkouts that never increment campaign.currentAmount.
    const paidWhere = { ...donationWhere, ...PAID_DONATION_FILTER };
    const oneTimeWhere = { ...paidWhere, subscriptionId: null };
    const fromSubscriptionWhere = { ...paidWhere, subscriptionId: { not: null } };
    const failedWhere = { ...donationWhere, status: 'FAILED' as const };

    const { monthStart, monthEnd } = getCurrentCalendarMonthUtcRange();
    const thisMonthDonationWhere = buildDonationWhere(monthStart, monthEnd, categoryId, campaignId);
    const thisMonthPaidWhere = { ...thisMonthDonationWhere, ...PAID_DONATION_FILTER };

    const subscriptionWhere: Record<string, unknown> = { status: 'ACTIVE' };
    if (campaignId && campaignId !== 'all') {
      subscriptionWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== 'all') {
      subscriptionWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    const [
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      paidCount,
      failedCount,
      totalAmountResult,
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
      prisma.campaign.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.count({ where: paidWhere }),
      prisma.donation.count({ where: failedWhere }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: paidWhere,
      }),
      prisma.donation.count({ where: oneTimeWhere }),
      prisma.donation.count({ where: fromSubscriptionWhere }),
      prisma.subscription.count({ where: subscriptionWhere }),
      prisma.subscription.count({
        where: { status: { in: ['PAUSED', 'CANCELLED'] } },
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: subscriptionWhere,
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { status: { in: ['PAUSED', 'CANCELLED'] } },
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
        where: { ...donationWhereAllTime, ...PAID_DONATION_FILTER },
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: failedWhere,
      }),
      prisma.donationItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationItemWhere(startDate, endDate, categoryId, campaignId),
      }),
      prisma.donationCategoryItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationCategoryItemWhere(startDate, endDate, categoryId),
      }),
      prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
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
          provider: true,
          paymentMethod: true,
          providerErrorMessage: true,
          donor: { select: { name: true } },
          items: {
            select: {
              campaign: { select: { title: true } },
            },
          },
          categoryItems: {
            select: {
              category: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    let oneTimeTotalAmount = oneTimeTotalResult._sum?.amountUSD ?? 0;
    let fromSubscriptionTotalAmount = fromSubscriptionTotalResult._sum?.amountUSD ?? 0;
    let totalAmount = oneTimeTotalAmount + fromSubscriptionTotalAmount;
    if (totalAmount === 0 && paidCount > 0) {
      const fb = await donationUsdRevenueFallback(paidWhere);
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
      const allTimePaidWhere = { ...donationWhereAllTime, ...PAID_DONATION_FILTER };
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
      where: paidWhere,
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
      amountUSD: d.amountUSD ?? 0,
      currency: d.currency,
      donorName: d.donor?.name ?? '—',
      type: d.subscriptionId ? ('MONTHLY' as const) : ('ONE_TIME' as const),
      status: d.status,
      provider: d.provider ?? null,
      paymentMethod: d.paymentMethod ?? null,
      providerErrorMessage: d.providerErrorMessage ?? null,
      campaignTitle: d.items[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    const failedTotalAmount = failedTotalResult._sum?.amountUSD ?? 0;

    /** All successful charges ever — ignores period / category / campaign query filters */
    const globalPaidWhere = { ...PAID_DONATION_FILTER };
    let paidRevenueAllTimeUnfiltered =
      (await prisma.donation.aggregate({ _sum: { amountUSD: true }, where: globalPaidWhere }))._sum?.amountUSD ?? 0;
    if (paidRevenueAllTimeUnfiltered === 0) {
      const globalPaidCount = await prisma.donation.count({ where: globalPaidWhere });
      if (globalPaidCount > 0) {
        paidRevenueAllTimeUnfiltered = await donationUsdSumFallback(globalPaidWhere);
      }
    }

    return NextResponse.json({
      totalCampaigns,
      totalCategories,
      totalDonations,
      totalUsers,
      // Revenue (PAID only)
      totalAmount,
      allTimeRevenue,
      paidRevenueAllTimeUnfiltered,
      paidCount,
      failedCount,
      failedTotalAmount,
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
      monthlyTransactionCount: fromSubscriptionCount,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch admin statistics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
