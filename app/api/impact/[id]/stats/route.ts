import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/impact/:id/stats — settled totals and the needs breakdown.
 *
 * `raisedUSD` is the backing campaign's currentAmount, which the payment
 * webhooks increment (it includes monthly renewals). The needs breakdown counts
 * lines whose donation settled — i.e. one-time gifts plus each subscription's
 * first payment; renewals repeat the subscription's lines and are summarised
 * separately as active monthly pledges.
 */
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const impact = await prisma.impactCampaign.findUnique({
      where: { id },
      select: { id: true, campaignId: true, campaign: { select: { currentAmount: true } } },
    });
    if (!impact) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const [paidLines, paidDonations, activeSubs, recent] = await Promise.all([
      prisma.impactDonationLine.findMany({
        where: { impactCampaignId: id, donation: { is: { paidAt: { not: null } } } },
        select: { regionKey: true, needKey: true, quantity: true, amountUSD: true },
      }),
      prisma.donationItem.count({
        where: { campaignId: impact.campaignId, donation: { is: { paidAt: { not: null } } } },
      }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE", items: { some: { campaignId: impact.campaignId } } },
        select: { items: { where: { campaignId: impact.campaignId }, select: { amountUSD: true } } },
      }),
      prisma.donation.findMany({
        where: { paidAt: { not: null }, items: { some: { campaignId: impact.campaignId } } },
        orderBy: { paidAt: "desc" },
        take: 25,
        select: {
          id: true,
          paidAt: true,
          amount: true,
          amountUSD: true,
          currency: true,
          subscriptionId: true,
          donor: { select: { name: true, email: true } },
          impactLines: { select: { regionKey: true, needKey: true, quantity: true } },
        },
      }),
    ]);

    const breakdown = new Map<string, { regionKey: string; needKey: string; quantity: number; amountUSD: number }>();
    for (const l of paidLines) {
      const k = `${l.regionKey}|${l.needKey}`;
      const cur = breakdown.get(k) ?? { regionKey: l.regionKey, needKey: l.needKey, quantity: 0, amountUSD: 0 };
      cur.quantity += l.quantity;
      cur.amountUSD += l.amountUSD;
      breakdown.set(k, cur);
    }

    return NextResponse.json({
      raisedUSD: impact.campaign.currentAmount,
      paidDonations,
      activeMonthly: activeSubs.length,
      monthlyPledgedUSD: activeSubs.reduce(
        (s, sub) => s + sub.items.reduce((x, i) => x + (i.amountUSD ?? 0), 0),
        0
      ),
      breakdown: [...breakdown.values()].sort((a, b) => b.amountUSD - a.amountUSD),
      recent,
    });
  } catch (error) {
    console.error("[impact] stats:", error);
    return NextResponse.json({ error: "تعذّر تحميل الإحصاءات" }, { status: 500 });
  }
}
