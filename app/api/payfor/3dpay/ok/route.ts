import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const donationId = searchParams.get("donationId") || "";
  const locale = (searchParams.get("locale") || "en").toLowerCase();

  if (!donationId) {
    return NextResponse.redirect(new URL(`/${locale}/campaigns?payment=failed`, origin));
  }

  const form = await req.formData();
  const raw = Object.fromEntries(form.entries());

  // Log full bank response for debugging
  console.log("[PayFor OK] Bank response:", JSON.stringify(raw, null, 2));

  const orderId = String(raw.OrderId || raw.orderId || "");
  const procReturnCode = String(raw.ProcReturnCode || raw.ProcReturnCode?.toString?.() || raw.procReturnCode || "");
  const txnResult = String(raw.TxnResult || raw.txnResult || "");
  const errorMessage = String(raw.ErrorMessage || raw.errorMessage || "");
  const authCode = String(raw.AuthCode || raw.authCode || "");
  const hostRefNum = String(raw.HostRefNum || raw.hostRefNum || "");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id: donationId },
        include: {
          items: { include: { campaign: { select: { title: true } } } },
          categoryItems: { include: { category: { select: { name: true } } } },
          donor: { select: { email: true } },
        },
      });
      if (!donation) return { ok: false as const, reason: "not_found" as const };

      // Idempotency: if already confirmed by a prior callback, just redirect to success
      if (donation.paidAt !== null) return { ok: true as const };

      // Basic linkage check
      if (donation.providerOrderId && orderId && donation.providerOrderId !== orderId) {
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            provider: "PAYFOR",
            providerProcReturnCode: procReturnCode || null,
            providerTxnResult: txnResult || null,
            providerAuthCode: authCode || null,
            providerHostRefNum: hostRefNum || null,
            providerErrorMessage: `OrderId mismatch`,
            providerRaw: raw as any,
          },
        });
        return { ok: false as const, reason: "order_mismatch" as const, donation };
      }

      const isSuccess = procReturnCode === "00" || txnResult.toLowerCase() === "success";
      if (!isSuccess) {
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            provider: "PAYFOR",
            providerProcReturnCode: procReturnCode || null,
            providerTxnResult: txnResult || null,
            providerAuthCode: authCode || null,
            providerHostRefNum: hostRefNum || null,
            providerErrorMessage: errorMessage || "Payment failed",
            providerRaw: raw as any,
          },
        });
        return { ok: false as const, reason: "failed" as const, donation };
      }

      await tx.donation.update({
        where: { id: donation.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          provider: "PAYFOR",
          providerProcReturnCode: procReturnCode || null,
          providerTxnResult: txnResult || null,
          providerAuthCode: authCode || null,
          providerHostRefNum: hostRefNum || null,
          providerErrorMessage: null,
          providerRaw: raw as any,
        },
      });

      // Apply increments only on confirmed payment
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

      return { ok: true as const };
    });

    if (result.ok) {
      return NextResponse.redirect(new URL(`/${locale}/success/${donationId}`, origin));
    }

    // PayFor failed — attempt Stripe fallback if we have donation data
    if ("donation" in result && result.donation) {
      const failed = result.donation;
      try {
        const campaignNames = failed.items.map((i: { campaign: { title: string } }) => i.campaign.title).join(", ");
        const categoryNames = failed.categoryItems.map((i: { category: { name: string } }) => i.category.name).join(", ");
        const productName = campaignNames || categoryNames || "Donation";

        const newDonation = await prisma.donation.create({
          data: {
            amount: failed.amount,
            amountUSD: failed.amountUSD ?? failed.amount,
            teamSupport: failed.teamSupport,
            coverFees: failed.coverFees,
            currency: failed.currency,
            fees: failed.fees,
            totalAmount: failed.totalAmount,
            status: "PAID",
            locale: failed.locale ?? locale,
            donorId: failed.donorId,
            paymentMethod: "CARD",
            provider: "STRIPE",
            ...(failed.referralId ? { referralId: failed.referralId } : {}),
            items:
              failed.items.length > 0
                ? {
                    create: failed.items.map((i: { campaignId: string; amount: number; amountUSD: number | null }) => ({
                      campaignId: i.campaignId,
                      amount: i.amount,
                      amountUSD: i.amountUSD,
                    })),
                  }
                : undefined,
            categoryItems:
              failed.categoryItems.length > 0
                ? {
                    create: failed.categoryItems.map((i: { categoryId: string; amount: number; amountUSD: number | null }) => ({
                      categoryId: i.categoryId,
                      amount: i.amount,
                      amountUSD: i.amountUSD,
                    })),
                  }
                : undefined,
          },
        });

        const currency = (failed.currency || "USD").toLowerCase();
        const amountInSmallestUnit = Math.round(failed.totalAmount * 100);

        const stripeSession = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency,
                product_data: { name: productName },
                unit_amount: amountInSmallestUnit,
              },
              quantity: 1,
            },
          ],
          success_url: `${origin}/${locale}/success/${newDonation.id}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/${locale}/campaigns?payment=cancelled&donationId=${encodeURIComponent(newDonation.id)}`,
          metadata: {
            donationId: newDonation.id,
            userId: failed.donorId,
            payforFallback: "true",
            originalDonationId: donationId,
          },
          customer_email: failed.donor?.email ?? undefined,
        });

        await prisma.donation.update({
          where: { id: newDonation.id },
          data: { providerOrderId: stripeSession.id },
        });

        console.log(
          `[PayFor OK→FAIL → Stripe] Original ${donationId} failed. New donation ${newDonation.id}. Redirecting to Stripe ${stripeSession.id}`
        );

        return NextResponse.redirect(stripeSession.url!, 303);
      } catch (stripeErr) {
        console.error("[PayFor OK→FAIL] Stripe fallback failed:", stripeErr);
      }
    }

    return NextResponse.redirect(
      new URL(`/${locale}/campaigns?payment=failed&donationId=${encodeURIComponent(donationId)}`, origin)
    );
  } catch (e) {
    console.error("PayFor OK callback error:", e);
    return NextResponse.redirect(
      new URL(`/${locale}/campaigns?payment=failed&donationId=${encodeURIComponent(donationId)}`, origin)
    );
  }
}

