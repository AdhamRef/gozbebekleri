import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';

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
  } else {
    endDate = endParam ? new Date(endParam + 'T23:59:59.999Z') : new Date();
    startDate = new Date(endDate);
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
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

    const [
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      totalAmountResult,
      oneTimeCount,
      monthlyCount,
      activeMonthlyCount,
      monthlyStoppedCount,
      monthlyRecurringRevenueResult,
      monthlyStoppedAmountResult,
      thisMonthRevenueResult,
      oneTimeTotalResult,
      monthlyTotalResult,
      campaignDonationsSum,
      categoryDonationsSum,
      teamSupportFeesSum,
      recentDonations,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.aggregate({
        _sum: { totalAmount: true, amount: true, amountUSD: true },
        where: donationWhere,
      }),
      prisma.donation.count({ where: { ...donationWhere, type: 'ONE_TIME' } }),
      prisma.donation.count({ where: { ...donationWhere, type: 'MONTHLY' } }),
      prisma.donation.count({
        where: { ...donationWhere, type: 'MONTHLY', status: 'ACTIVE' },
      }),
      prisma.donation.count({
        where: {
          ...donationWhere,
          type: 'MONTHLY',
          status: { in: ['PAUSED', 'CANCELLED'] },
        },
      }),
      prisma.donation.aggregate({
        _sum: { totalAmount: true, amountUSD: true, amount: true },
        where: { ...donationWhere, type: 'MONTHLY', status: 'ACTIVE' },
      }),
      prisma.donation.aggregate({
        _sum: { totalAmount: true, amountUSD: true, amount: true },
        where: {
          ...donationWhere,
          type: 'MONTHLY',
          status: { in: ['PAUSED', 'CANCELLED'] },
        },
      }),
      prisma.donation.aggregate({
        _sum: { totalAmount: true },
        where: donationWhere,
      }),
      prisma.donation.aggregate({
        _sum: { totalAmount: true },
        where: { ...donationWhere, type: 'ONE_TIME' },
      }),
      prisma.donation.aggregate({
        _sum: { totalAmount: true },
        where: { ...donationWhere, type: 'MONTHLY' },
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
      prisma.donation.aggregate({
        _sum: { teamSupport: true, fees: true },
        where: donationWhere,
      }),
      prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: donationWhere,
        select: {
          id: true,
          amount: true,
          totalAmount: true,
          createdAt: true,
          currency: true,
          type: true,
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

    const totalAmount = totalAmountResult._sum.totalAmount ?? totalAmountResult._sum.amount ?? 0;
    const monthlyRecurringRevenue = monthlyRecurringRevenueResult._sum.totalAmount ?? 0;
    const activeMonthlyAmountUSD =
      monthlyRecurringRevenueResult._sum.amountUSD ??
      monthlyRecurringRevenueResult._sum.totalAmount ??
      monthlyRecurringRevenueResult._sum.amount ??
      0;
    const monthlyStoppedAmountUSD =
      monthlyStoppedAmountResult._sum.amountUSD ??
      monthlyStoppedAmountResult._sum.totalAmount ??
      monthlyStoppedAmountResult._sum.amount ??
      0;
    const thisMonthRevenue = thisMonthRevenueResult._sum.totalAmount ?? 0;
    const oneTimeTotalAmount = oneTimeTotalResult._sum.totalAmount ?? 0;
    const monthlyTotalAmount = monthlyTotalResult._sum.totalAmount ?? 0;
    const campaignDonationsTotal = campaignDonationsSum._sum.amountUSD ?? campaignDonationsSum._sum.amount ?? 0;
    const categoryDonationsTotal = categoryDonationsSum._sum.amountUSD ?? categoryDonationsSum._sum.amount ?? 0;
    const campaignDonationsCount = campaignDonationsSum._count?.id ?? 0;
    const categoryDonationsCount = categoryDonationsSum._count?.id ?? 0;
    const teamSupportTotal = teamSupportFeesSum._sum.teamSupport ?? 0;
    const feesTotal = teamSupportFeesSum._sum.fees ?? 0;

    const recentDonationsFormatted = recentDonations.map((d) => ({
      id: d.id,
      amount: d.totalAmount ?? d.amount,
      currency: d.currency,
      donorName: d.donor?.name ?? '—',
      type: d.type,
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
      oneTimeCount,
      monthlyCount,
      activeMonthlyCount,
      monthlyStoppedCount,
      monthlyRecurringRevenue,
      activeMonthlyAmountUSD,
      monthlyStoppedAmountUSD,
      thisMonthRevenue,
      oneTimeTotalAmount,
      monthlyTotalAmount,
      campaignDonationsTotal,
      categoryDonationsTotal,
      campaignDonationsCount,
      categoryDonationsCount,
      teamSupportTotal,
      feesTotal,
      recentDonations: recentDonationsFormatted,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
