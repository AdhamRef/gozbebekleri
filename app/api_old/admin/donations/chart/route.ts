import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const campaignId = searchParams.get('campaignId');

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // First, get campaigns that match our filters
    let campaignFilter = {};
    if (campaignId && campaignId !== 'all') {
      campaignFilter = { id: campaignId };
    } else if (categoryId && categoryId !== 'all') {
      campaignFilter = { categoryId: categoryId };
    }

    // Get campaign IDs that match our filters
    const matchingCampaigns = await prisma.campaign.findMany({
      where: campaignFilter,
      select: { id: true }
    });
    
    const campaignIds = matchingCampaigns.map(c => c.id);

    // Query donation items directly using Prisma
    const donationItems = await prisma.donationItem.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...(campaignIds.length > 0 ? { campaignId: { in: campaignIds } } : {})
      },
      select: {
        createdAt: true,
        amount: true,
        amountUSD: true
      }
    });

    // Group donations by date
    const donationsByDate = new Map();
    
    donationItems.forEach(item => {
      const dateStr = item.createdAt.toISOString().split('T')[0];
      const amount = item.amountUSD !== null ? Number(item.amountUSD) : Number(item.amount);
      
      if (donationsByDate.has(dateStr)) {
        donationsByDate.set(dateStr, donationsByDate.get(dateStr) + amount);
      } else {
        donationsByDate.set(dateStr, amount);
      }
    });

    // Generate complete date range with zero-filled gaps
    const filledChartData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      filledChartData.push({
        date: dateStr,
        amountUSD: donationsByDate.has(dateStr) 
          ? Number(parseFloat(donationsByDate.get(dateStr).toFixed(2))) 
          : 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Print more debugging information
    console.log(`Queried ${donationItems.length} donation items`);
    console.log(`Found donations for ${donationsByDate.size} different dates`);
    
    return NextResponse.json(filledChartData);

  } catch (error) {
    console.error('Error fetching donation chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation chart data', details: error.message },
      { status: 500 }
    );
  }
}