import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// POST /api/stripe/fallback
// Called when PayFor 3D fails. If a paymentMethodId is supplied, charges the
// card directly. Otherwise (legacy path) creates a Stripe Checkout session.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      donationId?: string;
      paymentMethodId?: string;
      locale?: string;
    };

    const donationId = String(body.donationId || "").trim();
    const paymentMethodId = String(body.paymentMethodId || "").trim();

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

    const locale = (body.locale ?? donation.locale ?? "en").toLowerCase();
    const currency = (donation.currency || "USD").toLowerCase();
    const amountInSmallestUnit = Math.round(donation.totalAmount * 100);

    const campaignNames = donation.items.map((i) => i.campaign.title).join(", ");
    const categoryNames = donation.categoryItems.map((i) => i.category.name).join(", ");
    const description = campaignNames || categoryNames || "Donation";

    // Clone into a fresh PENDING donation if the original failed (so we have a clean record)
    let targetDonationId = donationId;

    if (donation.status === "FAILED") {
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

    // Direct charge path — no redirect
    if (paymentMethodId) {
      const origin = new URL(req.url).origin;
      const returnUrl = `${origin}/${locale}/success/${targetDonationId}`;

      const intent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency,
        payment_method: paymentMethodId,
        description,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          donationId: targetDonationId,
          userId: session.user.id,
          payforFallback: "true",
          originalDonationId: donationId,
        },
        return_url: returnUrl,
      });

      await prisma.donation.update({
        where: { id: targetDonationId },
        data: { providerOrderId: intent.id },
      });

      if (intent.status === "succeeded") {
        await prisma.donation.update({
          where: { id: targetDonationId },
          data: { status: "PAID" },
        });
        return NextResponse.json({ status: "succeeded", donationId: targetDonationId });
      }

      if (intent.status === "requires_action") {
        return NextResponse.json({
          status: "requires_action",
          clientSecret: intent.client_secret,
          donationId: targetDonationId,
        });
      }

      await prisma.donation.update({
        where: { id: targetDonationId },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: `Payment failed with status: ${intent.status}` },
        { status: 400 }
      );
    }

    // Legacy path: no paymentMethodId — return nothing (caller should handle gracefully)
    return NextResponse.json(
      { error: "paymentMethodId is required for direct charge" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Stripe Fallback] error:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
