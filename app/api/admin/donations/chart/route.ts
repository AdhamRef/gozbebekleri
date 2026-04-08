import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';

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

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'revenue');
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const campaignId = searchParams.get('campaignId');
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'month';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const showFailed = searchParams.get('showFailed') === 'true';

    const { startDate, endDate } = getDateRange(period, startParam, endParam);

    const baseWhere: Record<string, unknown> = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (userId && userId !== 'all') {
      baseWhere.donorId = userId;
    }

    if (campaignId && campaignId !== 'all') {
      baseWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== 'all') {
      baseWhere.OR = [
        { items: { some: { campaign: { categoryId } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }

    // Always fetch both paid and failed donations
    const donations = await prisma.donation.findMany({
      where: baseWhere,
      select: {
        createdAt: true,
        subscriptionId: true,
        teamSupport: true,
        fees: true,
        amountUSD: true,
        totalAmount: true,
        amount: true,
        status: true,
        items: { select: { amount: true, amountUSD: true } },
        categoryItems: { select: { amount: true, amountUSD: true } },
      },
    });

    type Bucket = {
      amountOneTime: number;
      countOneTime: number;
      amountMonthly: number;
      countMonthly: number;
      amountFailed: number;
      countFailed: number;
      teamSupport: number;
      fees: number;
    };
    const byDate = new Map<string, Bucket>();

    for (const d of donations) {
      const dateStr = toDateStr(d.createdAt);
      const bucket = byDate.get(dateStr) ?? {
        amountOneTime: 0,
        countOneTime: 0,
        amountMonthly: 0,
        countMonthly: 0,
        amountFailed: 0,
        countFailed: 0,
        teamSupport: 0,
        fees: 0,
      };

      const amount = Number(d.amountUSD ?? d.totalAmount ?? d.amount ?? 0);
      const isPaid = d.status === 'PAID';
      const isFailed = d.status === 'FAILED';

      if (isPaid) {
        if (d.subscriptionId == null) {
          bucket.amountOneTime += amount;
          bucket.countOneTime += 1;
        } else {
          bucket.amountMonthly += amount;
          bucket.countMonthly += 1;
        }
        bucket.teamSupport += Number(d.teamSupport ?? 0);
        bucket.fees += Number(d.fees ?? 0);
      } else if (isFailed) {
        bucket.amountFailed += amount;
        bucket.countFailed += 1;
      }

      byDate.set(dateStr, bucket);
    }

    const filledChartData: {
      date: string;
      amountUSD: number;
      count: number;
      amountOneTime: number;
      countOneTime: number;
      amountMonthly: number;
      countMonthly: number;
      amountFailed: number;
      countFailed: number;
      teamSupport: number;
      fees: number;
    }[] = [];

    const current = new Date(startDate.getTime());
    const endTime = endDate.getTime();

    while (current.getTime() <= endTime) {
      const dateStr = toDateStr(current);
      const b = byDate.get(dateStr);
      const amountOneTime = b ? Number(Number(b.amountOneTime).toFixed(2)) : 0;
      const amountMonthly = b ? Number(Number(b.amountMonthly).toFixed(2)) : 0;
      const amountFailed = b ? Number(Number(b.amountFailed).toFixed(2)) : 0;
      const countOneTime = b?.countOneTime ?? 0;
      const countMonthly = b?.countMonthly ?? 0;
      const countFailed = b?.countFailed ?? 0;
      const teamSupport = b ? Number(Number(b.teamSupport).toFixed(2)) : 0;
      const fees = b ? Number(Number(b.fees).toFixed(2)) : 0;

      filledChartData.push({
        date: dateStr,
        amountUSD: Number((amountOneTime + amountMonthly).toFixed(2)),
        count: countOneTime + countMonthly,
        amountOneTime,
        countOneTime,
        amountMonthly,
        countMonthly,
        amountFailed,
        countFailed,
        teamSupport,
        fees,
      });

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return NextResponse.json(filledChartData);
  } catch (error) {
    console.error('Error fetching donation chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation chart data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
