import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import { getUserIdsMatchingBadge, getBadgeIdsByUser } from '@/lib/badge-criteria';

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const preferredLang = searchParams.get('preferredLang') || undefined;
    const badgeId = searchParams.get('badgeId') || undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'name' | 'email' | 'donationsCount' | 'totalDonated';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10') || 10, 100);
    const skip = (page - 1) * limit;

    // Build filter conditions (MongoDB: no mode 'insensitive', use contains)
    let where: Record<string, unknown> = {
      ...(role && { role: role as 'ADMIN' | 'DONOR' }),
      ...(preferredLang && { preferredLang }),
      ...(search && search.length > 0 && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    if (badgeId) {
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId },
        select: { criteria: true },
      });
      if (badge) {
        const badgeUserIds = await getUserIdsMatchingBadge(badge.criteria);
        if (badgeUserIds.length === 0) {
          where = { ...where, id: { in: [] } };
        } else {
          where = { ...where, id: { in: badgeUserIds } };
        }
      }
    }

    const total = await prisma.user.count({ where });

    const isAggregateSort = sortBy === 'donationsCount' || sortBy === 'totalDonated';
    let orderedIds: string[] = [];

    if (isAggregateSort && total > 0) {
      const userIds = (await prisma.user.findMany({ where, select: { id: true } })).map((u) => u.id);
      const group = await prisma.donation.groupBy({
        by: ['donorId'],
        where: { donorId: { in: userIds } },
        _count: { id: true },
        _sum: { amountUSD: true, totalAmount: true },
      });
      const byDonor = new Map(group.map((r) => [r.donorId, r]));
      const withZero = userIds.map((id) => {
        const g = byDonor.get(id);
        return {
          donorId: id,
          count: g?._count.id ?? 0,
          amountUSD: g?._sum.amountUSD ?? 0,
        };
      });
      const mult = sortOrder === 'desc' ? 1 : -1;
      if (sortBy === 'donationsCount') {
        withZero.sort((a, b) => mult * (a.count - b.count));
      } else {
        withZero.sort((a, b) => mult * (a.amountUSD - b.amountUSD));
      }
      orderedIds = withZero.map((x) => x.donorId);
    }

    const orderByField = sortBy === 'name' || sortBy === 'email' || sortBy === 'createdAt'
      ? sortBy
      : 'createdAt';
    const users = isAggregateSort && orderedIds.length > 0
      ? await (async () => {
          const pageIds = orderedIds.slice(skip, skip + limit);
          const byId = new Map(
            (await prisma.user.findMany({
              where: { id: { in: pageIds } },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                preferredLang: true,
                country: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { donations: true } },
              },
            })).map((u) => [u.id, u])
          );
          return pageIds.map((id) => byId.get(id)).filter(Boolean) as Awaited<ReturnType<typeof prisma.user.findMany>>;
        })()
      : await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            preferredLang: true,
            country: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { donations: true } },
          },
          orderBy: orderByField === 'createdAt' ? { createdAt: sortOrder } : { [orderByField]: sortOrder },
          skip,
          take: limit,
        });

    const userIds = users.map((u) => u.id);
    const totalsByUser =
      userIds.length > 0
        ? await prisma.donation.groupBy({
            by: ['donorId'],
            where: { donorId: { in: userIds } },
            _sum: { totalAmount: true, amountUSD: true },
            _max: { createdAt: true },
          })
        : [];
    const totalByDonorId = new Map(
      totalsByUser.map((r) => [
        r.donorId,
        {
          totalAmount: r._sum.totalAmount ?? 0,
          amountUSD: r._sum.amountUSD ?? 0,
          lastDonationAt: r._max.createdAt ?? null,
        },
      ])
    );

    const allBadges = await prisma.badge.findMany({
      select: { id: true, criteria: true },
      orderBy: { order: 'asc' },
    });
    const badgeIdsByUser = userIds.length > 0 && allBadges.length > 0
      ? await getBadgeIdsByUser(userIds, allBadges)
      : new Map<string, string[]>();

    const usersWithTotals = users.map((u) => ({
      ...u,
      totalDonationsCount: u._count.donations,
      totalDonatedAmount: totalByDonorId.get(u.id)?.totalAmount ?? 0,
      totalDonatedAmountUSD: totalByDonorId.get(u.id)?.amountUSD ?? 0,
      lastDonationAt: totalByDonorId.get(u.id)?.lastDonationAt ?? null,
      badgeIds: badgeIdsByUser.get(u.id) ?? [],
    }));

    return NextResponse.json({
      users: usersWithTotals,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, role } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role || 'DONOR',
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 