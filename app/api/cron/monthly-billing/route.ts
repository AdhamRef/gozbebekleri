import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Returns the next billing date (next month, same day or last day of month) */
function getNextBillingDate(from: Date, billingDay: number | null): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  if (billingDay != null && billingDay >= 1 && billingDay <= 31) {
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(billingDay, lastDay));
  }
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

/** Process monthly billing: for each ACTIVE Subscription due, create a Donation (transaction) and update subscription dates */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextBillingDate: { lte: todayStart },
      },
      include: {
        items: true,
        categoryItems: true,
      },
    });

    let processed = 0;
    let skipped = 0;
    let attempted = 0;
    const errors: Array<{ subscriptionId: string; reason: string }> = [];

    for (const sub of dueSubscriptions) {
      // We can only do real automatic monthly billing if we have a bank-supported token/reference transaction.
      // Never charge by storing CVV; that is not allowed.
      if (!sub.payforToken) {
        skipped++;
        continue;
      }

      attempted++;
      const transactionDate = sub.nextBillingDate || now;
      const amountUSD = sub.amountUSD ?? sub.amount ?? 0;
      const totalAmount = sub.amount ?? 0;
      const fees = 0; // subscription template doesn't store per-charge fees; could be computed if needed
      const finalTotalAmount = totalAmount + (sub.teamSupport ?? 0) + fees;

      await prisma.$transaction(async (tx) => {
        const donation = await tx.donation.create({
          data: {
            amount: totalAmount,
            amountUSD,
            totalAmount: finalTotalAmount,
            currency: sub.currency,
            teamSupport: sub.teamSupport ?? 0,
            coverFees: sub.coverFees,
            fees,
            status: "PAID",
            donorId: sub.donorId,
            referralId: sub.referralId ?? undefined,
            subscriptionId: sub.id,
            paymentMethod: sub.paymentMethod,
            cardDetails: null,
            items: sub.items.length
              ? {
                  create: sub.items.map((item) => ({
                    campaignId: item.campaignId,
                    amount: item.amount,
                    amountUSD: item.amountUSD ?? undefined,
                  })),
                }
              : undefined,
            categoryItems: sub.categoryItems.length
              ? {
                  create: sub.categoryItems.map((item) => ({
                    categoryId: item.categoryId,
                    amount: item.amount,
                    amountUSD: item.amountUSD ?? undefined,
                  })),
                }
              : undefined,
          },
        });
        // TODO: Call PayFor 2D recurring charge using sub.payforToken.
        // Only on success (ProcReturnCode=00) should we mark donation PAID and increment totals.
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            provider: "PAYFOR",
            providerErrorMessage:
              "Recurring charge not implemented: bank token/reference transaction spec is required.",
          },
        });

        const nextBilling = getNextBillingDate(transactionDate, sub.billingDay);

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            lastBillingDate: transactionDate,
            nextBillingDate: nextBilling,
          },
        });
      });
      processed++;
    }

    return NextResponse.json({
      ok: true,
      totalDue: dueSubscriptions.length,
      processed,
      attempted,
      skipped,
      errors,
      note:
        "Automatic PayFor recurring charges require bank token/reference transactions. Subscriptions without payforToken are skipped.",
    });
  } catch (error) {
    console.error("Monthly billing cron error:", error);
    return NextResponse.json(
      { error: "Monthly billing failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
