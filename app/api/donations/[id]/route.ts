import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { DonationType, SubscriptionStatus } from '@prisma/client';
// GET /api/donations/[id] - Get donation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Donation ID required' }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const donation = await prisma.donation.findUnique({
      where: { id },
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
                translations: {
                  select: { locale: true, title: true },
                },
              },
            },
          },
        },
        categoryItems: {
          include: {
            category: {
              select: {
                name: true,
                image: true,
                translations: {
                  select: { locale: true, name: true },
                },
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

    return NextResponse.json(donation);
  } catch (error) {
    console.error('Error fetching donation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation' },
      { status: 500 }
    );
  }
}

/** Compute next billing date from billing day (1–28). If day has passed this month, next month. */
function nextBillingFromDay(billingDay: number): Date {
  const d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth();
  const day = Math.min(billingDay, 28);
  if (d.getDate() >= day) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return new Date(year, month, day);
}

// PUT /api/donations/[id] - Update donation (admin full update; donor can update status + billingDay for own MONTHLY)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, billingDay } = body;

    const currentDonation = await prisma.donation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!currentDonation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = session.user.id === currentDonation.donorId;

    // Donor: may only update status (ACTIVE/PAUSED) and/or billingDay for their own MONTHLY donation
    if (!isAdmin && isOwner) {
      if (currentDonation.type !== 'MONTHLY') {
        return NextResponse.json(
          { error: 'Only monthly donations can be updated' },
          { status: 400 }
        );
      }
      const updates: { status?: SubscriptionStatus; billingDay?: number; nextBillingDate?: Date } = {};
      if (status !== undefined) {
        if (![SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED].includes(status as SubscriptionStatus)) {
          return NextResponse.json(
            { error: 'Invalid status; use ACTIVE, PAUSED or CANCELLED' },
            { status: 400 }
          );
        }
        updates.status = status as SubscriptionStatus;
        if (status === SubscriptionStatus.ACTIVE && currentDonation.status !== SubscriptionStatus.ACTIVE) {
          const day = billingDay != null ? Math.min(28, Math.max(1, Number(billingDay))) : (currentDonation.billingDay ?? 1);
          updates.nextBillingDate = nextBillingFromDay(day);
          updates.billingDay = day;
        }
      }
      if (billingDay !== undefined) {
        const day = Math.min(28, Math.max(1, Number(billingDay)));
        updates.billingDay = day;
        if (currentDonation.status === SubscriptionStatus.ACTIVE) {
          updates.nextBillingDate = nextBillingFromDay(day);
        }
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(currentDonation);
      }
      const updatedDonation = await prisma.donation.update({
        where: { id },
        data: updates,
        include: {
          donor: { select: { name: true, email: true } },
          items: {
            include: {
              campaign: {
                select: {
                  title: true,
                  images: true,
                  translations: { select: { locale: true, title: true } },
                },
              },
            },
          },
          categoryItems: {
            include: {
              category: {
                select: {
                  name: true,
                  image: true,
                  translations: { select: { locale: true, name: true } },
                },
              },
            },
          },
        },
      });
      return NextResponse.json(updatedDonation);
    }

    // Admin: full status update (including CANCELLED)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (currentDonation.type !== 'MONTHLY') {
      return NextResponse.json(
        { error: 'Status can only be changed for monthly donations' },
        { status: 400 }
      );
    }

    // if (![SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED].includes(status as SubscriptionStatus)) {
    //   return NextResponse.json(
    //     { error: 'Invalid subscription status' },
    //     { status: 400 }
    //   );
    // }

    let nextBillingDate: Date | null = null;
    if (status === SubscriptionStatus.ACTIVE && currentDonation.status !== SubscriptionStatus.ACTIVE) {
      const day = billingDay != null ? Math.min(28, Math.max(1, Number(billingDay))) : (currentDonation.billingDay ?? 1);
      nextBillingDate = nextBillingFromDay(day);
    }

    const updatedDonation = await prisma.donation.update({
      where: { id },
      data: {
        status: status as SubscriptionStatus,
        ...(billingDay != null && { billingDay: Math.min(28, Math.max(1, Number(billingDay))) }),
        ...(nextBillingDate && { nextBillingDate }),
        ...(status === SubscriptionStatus.ACTIVE && { lastBillingDate: new Date() }),
      },
      include: {
        donor: { select: { name: true, email: true } },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                images: true,
                translations: { select: { locale: true, title: true } },
              },
            },
          },
        },
        categoryItems: {
          include: {
            category: {
              select: {
                name: true,
                image: true,
                translations: { select: { locale: true, name: true } },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get donation details with items and categoryItems before deletion
    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        items: true,
        categoryItems: true,
      },
    });

    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      );
    }

    // Delete donation and revert campaign/category amounts in a transaction
    await prisma.$transaction(async (tx) => {
      for (const item of donation.items) {
        await tx.campaign.update({
          where: { id: item.campaignId },
          data: { currentAmount: { decrement: item.amountUSD ?? item.amount } },
        });
      }
      for (const catItem of donation.categoryItems) {
        await tx.category.update({
          where: { id: catItem.categoryId },
          data: { currentAmount: { decrement: catItem.amountUSD ?? catItem.amount } },
        });
      }
      await tx.donation.delete({
        where: { id },
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