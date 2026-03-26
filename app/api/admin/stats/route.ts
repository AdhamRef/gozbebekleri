import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

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
    donation: { createdAt: { gte: startDate, lte: endDate } },
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
    donation: { createdAt: { gte: startDate, lte: endDate } },
  };
  if (categoryId && categoryId !== 'all') {
    base.categoryId = categoryId;
  }
  return base;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const categoryId = searchParams.get('categoryId');
    const campaignId = searchParams.get('campaignId');

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const donationWhere = buildDonationWhere(startDate, endDate, categoryId, campaignId);
    const donationWhereAllTime = buildDonationWhereAllTime(categoryId, campaignId);

    const oneTimeWhere = { ...donationWhere, subscriptionId: null };
    const fromSubscriptionWhere = { ...donationWhere, subscriptionId: { not: null } };

    const last30End = new Date();
    last30End.setUTCHours(23, 59, 59, 999);
    const last30Start = new Date(last30End);
    last30Start.setUTCDate(last30Start.getUTCDate() - 30);
    last30Start.setUTCHours(0, 0, 0, 0);
    const last30Where = { ...donationWhere, createdAt: { gte: last30Start, lte: last30End } };

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
      totalAmountResult,
      oneTimeCount,
      fromSubscriptionCount,
      activeSubscriptionCount,
      stoppedSubscriptionCount,
      monthlyRecurringRevenueResult,
      monthlyStoppedAmountResult,
      oneTimeTotalResult,
      fromSubscriptionTotalResult,
      last30TotalResult,
      allTimeRevenueResult,
      campaignDonationsSum,
      categoryDonationsSum,
      recentDonations,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationWhere,
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
        where: last30Where,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationWhereAllTime,
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

    const oneTimeTotalAmount = oneTimeTotalResult._sum?.amountUSD ?? 0;
    const fromSubscriptionTotalAmount = fromSubscriptionTotalResult._sum?.amountUSD ?? 0;
    const totalAmount = oneTimeTotalAmount + fromSubscriptionTotalAmount;

    const monthlyRecurringRevenue = monthlyRecurringRevenueResult._sum?.amountUSD ?? 0;
    const activeMonthlyAmountUSD = monthlyRecurringRevenue;
    const monthlyStoppedAmountUSD = monthlyStoppedAmountResult._sum?.amountUSD ?? 0;
    const thisMonthRevenue = last30TotalResult._sum?.amountUSD ?? 0;
    const allTimeRevenue = allTimeRevenueResult._sum?.amountUSD ?? 0;
    const campaignDonationsTotal = campaignDonationsSum._sum?.amountUSD ?? campaignDonationsSum._sum?.amount ?? 0;
    const categoryDonationsTotal = categoryDonationsSum._sum?.amountUSD ?? categoryDonationsSum._sum?.amount ?? 0;
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
      currency: d.currency,
      donorName: d.donor?.name ?? '—',
      type: d.subscriptionId ? ('MONTHLY' as const) : ('ONE_TIME' as const),
      campaignTitle: d.items[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({
      totalCampaigns,
      totalCategories,
      totalDonations,
      totalUsers,
      totalAmount,
      allTimeRevenue,
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
