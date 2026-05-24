import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';
import { parseIncludeInactive } from '@/lib/campaign/include-inactive-query';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'campaigns');
    if (denied) return denied;

    const includeInactive = parseIncludeInactive(request.nextUrl.searchParams);

    const campaigns = await prisma.campaign.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        donations: {
          select: {
            amount: true,
            createdAt: true,
          },
        },
        category: true, // Include category if needed
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}