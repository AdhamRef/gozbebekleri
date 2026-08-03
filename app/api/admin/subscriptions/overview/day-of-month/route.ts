import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { PAID_CONTRIBUTING_FILTER } from "@/lib/dashboard/donation-usd-revenue";
import { formatIstanbulDateKey } from "@/lib/admin/istanbul-calendar";

/**
 * GET /api/admin/subscriptions/overview/day-of-month
 *
 * Recurring money by DAY OF THE MONTH (1..31), aggregated across every month rather than
 * within one month. A subscription renews on the same calendar day each month, so this is the
 * shape of the recurring cycle: which days of the month the money actually lands on.
 *
 * Two views, because "the recurring donations for this day in each month" can mean either:
 *   - collected: what has actually settled on that day-of-month, summed over all months
 *   - expected:  what active subscriptions are scheduled to bill on that day-of-month
 * Both are returned so the UI can toggle without a second round trip.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "monthly");
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");
    const campaignId = searchParams.get("campaignId");
    const userId = searchParams.get("userId");
    const referralId = searchParams.get("referralId");

    const byCampaign = Boolean(campaignId && campaignId !== "all");
    const byCategory = !byCampaign && Boolean(categoryId && categoryId !== "all");

    // ---- collected: settled subscription donations, all time ----
    const donationWhere: Prisma.DonationWhereInput = {
      subscriptionId: { not: null },
      status: "PAID",
      // Not null implicitly — a null paidAt cannot satisfy a range, and settlement is what
      // makes a row real money. Same rule the chart and the KPI cards use.
      paidAt: { not: null },
    };
    if (referralId) donationWhere.referralId = referralId;
    if (userId && userId !== "all") donationWhere.donorId = userId;
    if (byCampaign) {
      donationWhere.items = { some: { campaignId: campaignId as string } };
    } else if (byCategory) {
      donationWhere.OR = [
        { items: { some: { campaign: { categoryIds: { has: categoryId as string } } } } },
        { categoryItems: { some: { categoryId: categoryId as string } } },
      ];
    }

    // ---- expected: active subscriptions and the day they bill on ----
    // `status: ACTIVE` alone is not enough. A subscription whose only charge attempts FAILED
    // (declined card) stays ACTIVE but has never produced money — 18 of them, worth $217/mo.
    // The MRR card already requires at least one settled charge; match it, or this view and
    // that card disagree by exactly those phantom subscriptions.
    const subscriptionWhere: Prisma.SubscriptionWhereInput = {
      status: "ACTIVE",
      donations: { some: PAID_CONTRIBUTING_FILTER },
    };
    if (referralId) subscriptionWhere.referralId = referralId;
    if (userId && userId !== "all") subscriptionWhere.donorId = userId;
    if (byCampaign) {
      subscriptionWhere.items = { some: { campaignId: campaignId as string } };
    } else if (byCategory) {
      subscriptionWhere.OR = [
        { items: { some: { campaign: { categoryIds: { has: categoryId as string } } } } },
        { categoryItems: { some: { categoryId: categoryId as string } } },
      ];
    }

    const [donations, subscriptions] = await Promise.all([
      prisma.donation.findMany({
        where: donationWhere,
        select: { paidAt: true, amountUSD: true, totalAmount: true, amount: true },
      }),
      prisma.subscription.findMany({
        where: subscriptionWhere,
        select: { nextBillingDate: true, lastBillingDate: true, createdAt: true, amountUSD: true, amount: true },
      }),
    ]);

    const collected = Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      amountUSD: 0,
      count: 0,
      monthsObserved: 0,
    }));
    // Distinct YYYY-MM per day, so a day seen in 3 different months can report an average
    // per month instead of a total that just reflects how long the platform has been running.
    const monthsSeen: Array<Set<string>> = Array.from({ length: 31 }, () => new Set<string>());

    for (const d of donations) {
      if (!d.paidAt) continue;
      const key = formatIstanbulDateKey(d.paidAt);
      const day = Number(key.slice(8, 10));
      if (!day || day < 1 || day > 31) continue;
      const slot = collected[day - 1];
      slot.amountUSD += Number(d.amountUSD ?? d.totalAmount ?? d.amount ?? 0);
      slot.count += 1;
      monthsSeen[day - 1].add(key.slice(0, 7));
    }
    for (let i = 0; i < 31; i++) {
      collected[i].monthsObserved = monthsSeen[i].size;
      collected[i].amountUSD = Number(collected[i].amountUSD.toFixed(2));
    }

    const expected = Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      amountUSD: 0,
      count: 0,
    }));

    for (const s of subscriptions) {
      // nextBillingDate is the authoritative billing day; the others are only fallbacks for
      // rows that predate it being populated.
      const anchor = s.nextBillingDate ?? s.lastBillingDate ?? s.createdAt;
      if (!anchor) continue;
      const day = Number(formatIstanbulDateKey(anchor).slice(8, 10));
      if (!day || day < 1 || day > 31) continue;
      expected[day - 1].amountUSD += Number(s.amountUSD ?? s.amount ?? 0);
      expected[day - 1].count += 1;
    }
    for (let i = 0; i < 31; i++) {
      expected[i].amountUSD = Number(expected[i].amountUSD.toFixed(2));
    }

    return NextResponse.json({
      collected,
      expected,
      totals: {
        collectedUSD: Number(collected.reduce((s, d) => s + d.amountUSD, 0).toFixed(2)),
        collectedCount: collected.reduce((s, d) => s + d.count, 0),
        expectedUSD: Number(expected.reduce((s, d) => s + d.amountUSD, 0).toFixed(2)),
        expectedCount: expected.reduce((s, d) => s + d.count, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching day-of-month subscription revenue:", error);
    return NextResponse.json(
      { error: "Failed to fetch day-of-month revenue", details: (error as Error).message },
      { status: 500 }
    );
  }
}
