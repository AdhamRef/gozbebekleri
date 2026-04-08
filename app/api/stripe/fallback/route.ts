import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// POST /api/stripe/fallback
// Called when PayFor 3D fails (bank error, timeout, user closed popup).
// Handles both PENDING donations (bank never responded) and FAILED donations
// (bank responded with failure). Creates a Stripe Checkout Session and returns
// the URL to redirect the user to — no extra clicks needed.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { donationId?: string; locale?: string };
    const donationId = String(body.donationId || "").trim();
    if (!donationId) {
      return NextResponse.json({ error: "donationId is required" }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        items: { include: { campaign: { select: { title: true } } } },
        categoryItems: { include: { category: { select: { name: true } } } },
      },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }
    if (donation.donorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (donation.status === "PAID") {
      return NextResponse.json({ error: "Donation already paid" }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const locale = (body.locale ?? donation.locale ?? "en").toLowerCase();

    const campaignNames = donation.items.map((i) => i.campaign.title).join(", ");
    const categoryNames = donation.categoryItems.map((i) => i.category.name).join(", ");
    const productName = campaignNames || categoryNames || "Donation";
    const currency = (donation.currency || "USD").toLowerCase();
    const amountInSmallestUnit = Math.round(donation.totalAmount * 100);

    let targetDonationId = donationId;

    if (donation.status === "FAILED") {
      // Clone into a fresh PENDING donation so the Stripe session has a clean record
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
      targetDonationId = newDonation.id;
    } else {
      // PENDING: reset provider to STRIPE on the existing donation
      await prisma.donation.update({
        where: { id: donationId },
        data: { provider: "STRIPE" },
      });
    }

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
      success_url: `${origin}/${locale}/success/${targetDonationId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/campaigns?payment=cancelled&donationId=${encodeURIComponent(targetDonationId)}`,
      metadata: {
        donationId: targetDonationId,
        userId: session.user.id,
        payforFallback: "true",
        originalDonationId: donationId,
      },
      customer_email: session.user.email ?? undefined,
    });

    await prisma.donation.update({
      where: { id: targetDonationId },
      data: { providerOrderId: stripeSession.id },
    });

    console.log(
      `[Stripe Fallback] PayFor donation ${donationId} (${donation.status}) → Stripe session ${stripeSession.id} for donation ${targetDonationId}`
    );

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Stripe fallback error:", error);
    return NextResponse.json({ error: "Failed to create Stripe fallback session" }, { status: 500 });
  }
}
