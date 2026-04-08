import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  writeAuditLog,
  auditActorFromDashboardSession,
} from "@/lib/audit-log";

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

/** PATCH /api/admin/subscriptions/[id] — set status (ACTIVE | PAUSED | CANCELLED); dashboard monthly permission */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "monthly");
    if (denied) return denied;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Subscription id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body?.status as string | undefined;

    if (!["ACTIVE", "PAUSED", "CANCELLED"].includes(String(status))) {
      return NextResponse.json(
        { error: "Invalid status; use ACTIVE, PAUSED or CANCELLED" },
        { status: 400 }
      );
    }

    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true, status: true, billingDay: true },
    });

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const nextStatus = status as SubscriptionStatus;
    const data: {
      status: SubscriptionStatus;
      billingDay?: number;
      nextBillingDate?: Date;
    } = { status: nextStatus };

    if (nextStatus === "ACTIVE" && sub.status !== "ACTIVE") {
      const day = Math.min(28, Math.max(1, sub.billingDay ?? 1));
      if (sub.billingDay == null) {
        data.billingDay = day;
      }
      data.nextBillingDate = nextBillingFromDay(day);
    }

    await prisma.subscription.update({
      where: { id },
      data,
    });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "SUBSCRIPTION_UPDATE",
      messageAr: `${actor.actorName ?? "مسؤول"} غيّر حالة الاشتراك إلى ${nextStatus}`,
      messageEn: `${actor.actorName ?? "Admin"} set subscription status to ${nextStatus}`,
      entityType: "Subscription",
      entityId: id,
      metadata: { status: nextStatus },
      stream: "TEAM",
    });

    const row = await prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        amount: true,
        amountUSD: true,
        currency: true,
        createdAt: true,
        nextBillingDate: true,
        lastBillingDate: true,
        billingDay: true,
        donor: { select: { id: true, name: true, email: true } },
        items: { select: { campaign: { select: { id: true, title: true } } } },
        categoryItems: { select: { category: { select: { id: true, name: true } } } },
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const payload = {
      id: row.id,
      status: row.status,
      amount: row.amount,
      amountUSD: row.amountUSD,
      currency: row.currency,
      createdAt: row.createdAt,
      nextBillingDate: row.nextBillingDate,
      lastBillingDate: row.lastBillingDate,
      billingDay: row.billingDay,
      donor: row.donor,
      campaigns: row.items.map((i) => ({ id: i.campaign.id, title: i.campaign.title })),
      categories: row.categoryItems.map((c) => ({
        id: c.category.id,
        name: c.category.name,
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to update subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
