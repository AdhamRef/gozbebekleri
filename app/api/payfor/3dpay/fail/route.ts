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

  console.error("[PayFor FAIL] Bank response:", JSON.stringify(raw, null, 2));

  const orderId = String(raw.OrderId || raw.orderId || "");
  const procReturnCode = String(raw.ProcReturnCode || raw.procReturnCode || "");
  const txnResult = String(raw.TxnResult || raw.txnResult || "");
  const errorMessage = String(raw.ErrorMessage || raw.errorMessage || "Payment failed");

  try {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        items: { include: { campaign: { select: { title: true } } } },
        categoryItems: { include: { category: { select: { name: true } } } },
        donor: { select: { email: true } },
      },
    });

    if (donation && donation.status !== "PAID") {
      // Mark the PayFor attempt as FAILED — preserves full audit trail
      await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: "FAILED",
          provider: "PAYFOR",
          providerOrderId: donation.providerOrderId ?? orderId ?? null,
          providerProcReturnCode: procReturnCode || null,
          providerTxnResult: txnResult || null,
          providerErrorMessage: errorMessage || null,
          providerRaw: raw as Record<string, unknown>,
        },
      });

      // ── Stripe fallback ──────────────────────────────────────────────────────
      // Clone the failed donation as a new PENDING record, then redirect the
      // user directly to Stripe Checkout — no page visit, no form, no clicks.
      try {
        const campaignNames = donation.items.map((i) => i.campaign.title).join(", ");
        const categoryNames = donation.categoryItems.map((i) => i.category.name).join(", ");
        const productName = campaignNames || categoryNames || "Donation";

        // Clone donation (new ID, PENDING, provider=STRIPE)
        const newDonation = await prisma.donation.create({
          data: {
            amount: donation.amount,
            amountUSD: donation.amountUSD ?? donation.amount,
            teamSupport: donation.teamSupport,
            coverFees: donation.coverFees,
            currency: donation.currency,
            fees: donation.fees,
            totalAmount: donation.totalAmount,
            status: "PENDING",
            locale: donation.locale ?? locale,
            donorId: donation.donorId,
            paymentMethod: "CARD",
            provider: "STRIPE",
            ...(donation.referralId ? { referralId: donation.referralId } : {}),
            items:
              donation.items.length > 0
                ? {
                    create: donation.items.map((i) => ({
                      campaignId: i.campaignId,
                      amount: i.amount,
                      amountUSD: i.amountUSD,
                    })),
                  }
                : undefined,
            categoryItems:
              donation.categoryItems.length > 0
                ? {
                    create: donation.categoryItems.map((i) => ({
                      categoryId: i.categoryId,
                      amount: i.amount,
                      amountUSD: i.amountUSD,
                    })),
                  }
                : undefined,
          },
        });

        const currency = (donation.currency || "USD").toLowerCase();
        // Stripe expects amounts in smallest unit (cents / kuruş / etc.)
        const amountInSmallestUnit = Math.round(donation.totalAmount * 100);

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
            userId: donation.donorId,
            payforFallback: "true",
            originalDonationId: donationId,
          },
          customer_email: donation.donor?.email ?? undefined,
        });

        // Store Stripe session ID on the new donation record
        await prisma.donation.update({
          where: { id: newDonation.id },
          data: { providerOrderId: stripeSession.id },
        });

        console.log(
          `[PayFor FAIL → Stripe] Original ${donationId} failed. New donation ${newDonation.id} created. Redirecting to Stripe session ${stripeSession.id}`
        );

        // Redirect user straight to Stripe — they just see the Stripe checkout page
        return NextResponse.redirect(stripeSession.url!, 303);
      } catch (stripeErr) {
        console.error("[PayFor FAIL] Stripe fallback failed:", stripeErr);
        // Fall through to the normal payment-failed page
      }
    }
  } catch (e) {
    console.error("[PayFor FAIL] Callback error:", e);
  }

  return NextResponse.redirect(
    new URL(
      `/${locale}/campaigns?payment=failed&donationId=${encodeURIComponent(donationId)}`,
      origin
    )
  );
}
