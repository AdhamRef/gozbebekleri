import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { SubscriptionStatus } from '@prisma/client';
import { userHasDashboardPermission } from '@/lib/dashboard/permissions';
import { isRevenueDashboardUser, requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';
import {
  writeAuditLog,
  auditActorFromDashboardSession,
  auditActorFromSiteSession,
  auditStreamForRole,
} from '@/lib/audit-log';

// GET /api/donations/[id] - Get donation (transaction) by ID; include type/status from subscription when applicable
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
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            gender: true,
            birthdate: true,
            countryCode: true,
            city: true,
            region: true,
          },
        },
        subscription: {
          select: {
            status: true,
            billingDay: true,
            nextBillingDate: true,
            lastBillingDate: true,
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

    const canViewAllDonations =
      userHasDashboardPermission(session.user, 'revenue');
    if (!canViewAllDonations && session.user.id !== donation.donorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sub = donation.subscription;
    const response = {
      ...donation,
      type: donation.subscriptionId ? ('MONTHLY' as const) : ('ONE_TIME' as const),
      paymentStatus: donation.status,
      subscriptionStatus: sub?.status ?? null,
      billingDay: sub?.billingDay ?? null,
      nextBillingDate: sub?.nextBillingDate ?? null,
      lastBillingDate: sub?.lastBillingDate ?? null,
    };
    return NextResponse.json(response);
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

// PUT /api/donations/[id] - Update subscription (when this donation is from a subscription); donor or admin can update status/billingDay
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
      include: {
        items: true,
        subscription: {
          select: { id: true, status: true, billingDay: true, nextBillingDate: true, lastBillingDate: true },
        },
      },
    });

    if (!currentDonation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      );
    }

    const isAdmin = isRevenueDashboardUser(session);
    const isOwner = session.user.id === currentDonation.donorId;

    if (!currentDonation.subscriptionId) {
      return NextResponse.json(
        { error: 'Only subscriptions can be updated; this donation is one-time' },
        { status: 400 }
      );
    }

    const sub = currentDonation.subscription;
    if (!sub) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const updates: { status?: SubscriptionStatus; billingDay?: number; nextBillingDate?: Date } = {};
    if (status !== undefined) {
      if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(String(status))) {
        return NextResponse.json(
          { error: 'Invalid status; use ACTIVE, PAUSED or CANCELLED' },
          { status: 400 }
        );
      }
      updates.status = status as SubscriptionStatus;
      if (status === 'ACTIVE' && sub.status !== 'ACTIVE') {
        const day = billingDay != null ? Math.min(28, Math.max(1, Number(billingDay))) : (sub.billingDay ?? 1);
        updates.nextBillingDate = nextBillingFromDay(day);
        updates.billingDay = day;
      }
    }
    if (billingDay !== undefined) {
      const day = Math.min(28, Math.max(1, Number(billingDay)));
      updates.billingDay = day;
      if ((updates.status ?? sub.status) === 'ACTIVE') {
        updates.nextBillingDate = nextBillingFromDay(day);
      }
    }

    if (Object.keys(updates).length === 0) {
      const out = await prisma.donation.findUnique({
        where: { id },
        omit: { cardDetails: true },
        include: {
          donor: { select: { name: true, email: true, image: true } },
          subscription: { select: { status: true, billingDay: true, nextBillingDate: true, lastBillingDate: true } },
          items: { include: { campaign: { select: { title: true, images: true, translations: { select: { locale: true, title: true } } } } } },
          categoryItems: { include: { category: { select: { name: true, image: true, translations: { select: { locale: true, name: true } } } } } },
        },
      });
      if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const s = out.subscription;
      return NextResponse.json({
        ...out,
        type: 'MONTHLY' as const,
        status: s?.status ?? null,
        billingDay: s?.billingDay ?? null,
        nextBillingDate: s?.nextBillingDate ?? null,
        lastBillingDate: s?.lastBillingDate ?? null,
      });
    }

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!isAdmin && isOwner && status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Only admin can cancel a subscription' },
        { status: 403 }
      );
    }

    await prisma.subscription.update({
      where: { id: currentDonation.subscriptionId },
      data: updates,
    });

    const subActor = isAdmin
      ? auditActorFromDashboardSession(session!)
      : auditActorFromSiteSession(session!);
    const subStream = isAdmin
      ? ("TEAM" as const)
      : auditStreamForRole(subActor.actorRole);
    await writeAuditLog({
      ...subActor,
      action: "SUBSCRIPTION_UPDATE",
      messageAr: `${subActor.actorName ?? "مستخدم"} عدّل الاشتراك الشهري المرتبط بالتبرع (${Object.keys(updates).join("، ")})`,
      entityType: "Subscription",
      entityId: currentDonation.subscriptionId!,
      metadata: {
        donationId: id,
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.billingDay !== undefined && { billingDay: updates.billingDay }),
      },
      stream: subStream,
    });

    const updatedDonation = await prisma.donation.findUnique({
      where: { id },
      omit: { cardDetails: true },
      include: {
        donor: { select: { name: true, email: true, image: true } },
        subscription: { select: { status: true, billingDay: true, nextBillingDate: true, lastBillingDate: true } },
        items: { include: { campaign: { select: { title: true, images: true, translations: { select: { locale: true, title: true } } } } } },
        categoryItems: { include: { category: { select: { name: true, image: true, translations: { select: { locale: true, name: true } } } } } },
      },
    });

    if (!updatedDonation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    const s = updatedDonation.subscription;
    return NextResponse.json({
      ...updatedDonation,
      type: 'MONTHLY' as const,
      status: s?.status ?? null,
      billingDay: s?.billingDay ?? null,
      nextBillingDate: s?.nextBillingDate ?? null,
      lastBillingDate: s?.lastBillingDate ?? null,
    });
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
    const denied = requireAdminOrDashboardPermission(session, 'revenue');
    if (denied) return denied;

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

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "DONATION_DELETE",
      messageAr: `${actor.actorName ?? "مسؤول"} حذف تبرعًا من السجلات (مع تعديل مبالغ الحملات/الأقسام إن وُجدت)`,
      entityType: "Donation",
      entityId: id,
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