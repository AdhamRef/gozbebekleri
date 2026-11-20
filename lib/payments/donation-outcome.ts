import { after } from "next/server";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchEvent } from "@/lib/events/dispatch";
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";

/**
 * "Not paid yet" for a filter. Donation rows are created WITHOUT a paidAt field at
 * all, and on MongoDB Prisma's `paidAt: null` does not match a missing field — so a
 * bare `paidAt: null` filter silently matches nothing (this left every declined
 * PayFor donation stuck as "pending"). Always use this instead.
 */
export const PAID_AT_UNSET = {
  OR: [{ paidAt: null }, { paidAt: { isSet: false } }],
} satisfies Prisma.DonationWhereInput;

/**
 * Credit a donation paid by a direct Stripe PaymentIntent: set PAID + paidAt and
 * increment campaign/category totals, all in one transaction guarded by `paidAt`
 * so the webhook, the fallback and the reconciler can race safely.
 *
 * Returns true only for the call that actually flipped the row.
 */
export async function markDonationPaidByStripeIntent(
  donationId: string,
  intent: Stripe.PaymentIntent
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({
      where: { id: donationId },
      include: { items: true, categoryItems: true },
    });
    // Rows are created with status=PAID before payment, so paidAt is the only proof.
    if (!donation || donation.paidAt != null) return false;

    await tx.donation.update({
      where: { id: donationId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        provider: "STRIPE",
        providerOrderId: intent.id,
        providerAuthCode: intent.id,
        providerTxnResult: "Success",
        providerErrorMessage: null,
        providerRaw: intent as never,
      },
    });

    for (const item of donation.items) {
      await tx.campaign.update({
        where: { id: item.campaignId },
        data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
      });
    }
    for (const item of donation.categoryItems) {
      await tx.category.update({
        where: { id: item.categoryId },
        data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
      });
    }
    return true;
  });
}

/**
 * Final failure of a donation (every gateway tried). Marks FAILED unless it was
 * paid or already failed, and fires DONATION_FAILED + the DonateFailed conversion
 * exactly once.
 */
export async function markDonationFailedFinal(
  donationId: string,
  data: {
    provider: "PAYFOR" | "STRIPE";
    errorMessage: string;
    providerOrderId?: string | null;
    raw?: unknown;
  }
): Promise<boolean> {
  const { count } = await prisma.donation.updateMany({
    where: { id: donationId, status: { not: "FAILED" }, ...PAID_AT_UNSET },
    data: {
      status: "FAILED",
      provider: data.provider,
      providerTxnResult: "Failed",
      providerErrorMessage: data.errorMessage.slice(0, 1000),
      ...(data.providerOrderId ? { providerOrderId: data.providerOrderId } : {}),
      ...(data.raw !== undefined ? { providerRaw: data.raw as never } : {}),
    },
  });
  if (count === 0) return false;
  after(() => dispatchEvent("DONATION_FAILED", { donationId }));
  void sendDonationFailedConversions(donationId);
  return true;
}
