import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { DonationType, SubscriptionStatus } from '@prisma/client';
import  useCampaignValue  from '@/hooks/useCampaignValue'; // Import the hook

// GET /api/donations/[id] - Get donation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const donation = await prisma.donation.findUnique({
      where: { id: params.id },
      omit: {
        cardDetails: true,
      },
      include: {
        donor: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this donation
    if (
      session.user.role !== 'ADMIN' &&
      session.user.id !== donation.donorId
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Apply useCampaignValue to each campaign in items
    const modifiedDonation = {
      ...donation,
      items: donation.items.map(item => ({
        ...item,
        campaign: {
          ...item.campaign,
        },
      })),
    };

    return NextResponse.json(modifiedDonation);
  } catch (error) {
    console.error('Error fetching donation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation' },
      { status: 500 }
    );
  }
}

// PUT /api/donations/[id] - Update donation (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body; // We only need status for this operation

    // Get current donation with items
    const currentDonation = await prisma.donation.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!currentDonation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      );
    }

    // Validate status change for monthly donations
    if (currentDonation.type !== 'MONTHLY') {
      return NextResponse.json(
        { error: 'Status can only be changed for monthly donations' },
        { status: 400 }
      );
    }

    if (![SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED].includes(status as SubscriptionStatus)) {
      return NextResponse.json(
        { error: 'Invalid subscription status' },
        { status: 400 }
      );
    }

    // Calculate next billing date if reactivating a subscription
    let nextBillingDate: Date | null = null;
    if (status === SubscriptionStatus.ACTIVE && currentDonation.status !== SubscriptionStatus.ACTIVE) {
      const now = new Date();
      nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    // Update donation status
    const updatedDonation = await prisma.donation.update({
      where: { id: params.id },
      data: {
        status: status as SubscriptionStatus,
        ...(nextBillingDate && { nextBillingDate }),
        ...(status === SubscriptionStatus.ACTIVE && { lastBillingDate: new Date() }),
      },
      include: {
        donor: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                images: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedDonation);
  } catch (error) {
    console.error('Error updating donation:', error);
    return NextResponse.json(
      { error: 'Failed to update donation', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/donations/[id] - Delete donation (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get donation details with items before deletion
    const donation = await prisma.donation.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      );
    }

    // Delete donation and update campaign amounts in a transaction
    await prisma.$transaction(async (prisma) => {
      // Update campaign amounts
      for (const item of donation.items) {
        await prisma.campaign.update({
          where: { id: item.campaignId },
          data: {
            currentAmount: {
              decrement: item.amount,
            },
          },
        });
      }

      // Delete donation (this will cascade delete items)
      await prisma.donation.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json(
      { message: 'Donation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting donation:', error);
    return NextResponse.json(
      { error: 'Failed to delete donation' },
      { status: 500 }
    );
  }
} 