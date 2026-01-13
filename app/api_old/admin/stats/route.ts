import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';

export async function GET() {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total counts and donations
    const [
      totalCampaigns,
      totalDonations,
      totalUsers,
      totalAmount,
      recentCampaigns,
      recentDonations,
      monthlyDonations // Fetch monthly donations
    ] = await Promise.all([
      // Total campaigns
      prisma.campaign.count(),
      
      // Total donations
      prisma.donation.count(),
      
      // Total users
      prisma.user.count(),
      
      // Total amount raised
      prisma.donation.aggregate({
        _sum: {
          amount: true
        }
      }),
      
      // Recent campaigns
      prisma.campaign.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          targetAmount: true,
          currentAmount: true,
          createdAt: true
        }
      }),
      
      // Recent donations with donor and campaign info
      prisma.donation.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          donor: {
            select: {
              name: true
            }
          },
          items: {
            select: {
              campaign: {
                select: {
                  title: true,
                  images: true
                }
              }
            }
          },
          amountUSD: true,
          currency: true,
          teamSupport: true,
          coverFees: true,
          fees: true,
          totalAmount: true,
          donorId: true,
          comment: true,
          type: true,
          status: true,
          paymentMethod: true,
          cardDetails: true,
          billingDay: true,
          lastBillingDate: true,
          nextBillingDate: true,
          Comment: true,
        }
      }),

      // Fetch monthly donations
      prisma.donation.findMany({
        where: {
          type: 'MONTHLY', // Filter for monthly donations
          status: 'ACTIVE', // Only active subscriptions
          donorId: session.user.id // Assuming you want donations for the logged-in user
        },
        select: {
          id: true,
          amount: true,
          nextBillingDate: true,
          items: {
            select: {
              id: true,
              campaign: {
                select: {
                  title: true,
                  images: true
                }
              }
            }
          }
        }
      })
    ]);

    // Transform donations data
    const formattedDonations = recentDonations.map(donation => ({
      id: donation.id,
      amount: donation.amount,
      currency: donation.currency,
      donorName: donation.donor.name || 'متبرع مجهول',
      campaignTitle: donation.items[0]?.campaign.title,
      createdAt: donation.createdAt
    }));

    // Format monthly donations
    const formattedMonthlyDonations = monthlyDonations.map(donation => ({
      id: donation.id,
      amount: donation.amount,
      nextBillingDate: donation.nextBillingDate,
      items: donation.items
    }));

    return NextResponse.json({
      totalCampaigns,
      totalDonations,
      totalUsers,
      totalAmount: totalAmount._sum.amount || 0,
      recentCampaigns,
      recentDonations: formattedDonations,
      monthlyDonations: formattedMonthlyDonations // Include monthly donations in the response
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
} 