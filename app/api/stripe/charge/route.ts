import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// POST /api/stripe/charge
// Directly charge a card via PaymentIntent (no redirect to Stripe Checkout).
// The client passes a Stripe PaymentMethod ID created client-side by stripe.js.
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

    if (!donationId || !paymentMethodId) {
      return NextResponse.json(
        { error: "donationId and paymentMethodId are required" },
        { status: 400 }
      );
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
    if (donation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Donation is not pending (status=${donation.status})` },
        { status: 400 }
      );
    }

    const locale = (body.locale ?? donation.locale ?? "en").toLowerCase();
    const currency = (donation.currency || "USD").toLowerCase();
    const amountInSmallestUnit = Math.round(donation.totalAmount * 100);

    const campaignNames = donation.items.map((i) => i.campaign.title).join(", ");
    const categoryNames = donation.categoryItems.map((i) => i.category.name).join(", ");
    const description = campaignNames || categoryNames || "Donation";

    const origin = new URL(req.url).origin;
    const returnUrl = `${origin}/${locale}/success/${donationId}`;

    const intent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency,
      payment_method: paymentMethodId,
      description,
      confirm: true,
      // Allow 3DS challenge if the issuing bank requires it
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        donationId,
        userId: session.user.id,
      },
      return_url: returnUrl,
    });

    // Update donation with provider info
    await prisma.donation.update({
      where: { id: donationId },
      data: {
        provider: "STRIPE",
        providerOrderId: intent.id,
        locale,
      },
    });

    if (intent.status === "succeeded") {
      await prisma.donation.update({
        where: { id: donationId },
        data: { status: "PAID" },
      });
      return NextResponse.json({ status: "succeeded" });
    }

    if (intent.status === "requires_action") {
      // 3DS challenge required — send clientSecret back to frontend to confirm
      return NextResponse.json({
        status: "requires_action",
        clientSecret: intent.client_secret,
      });
    }

    // Any other terminal failure
    await prisma.donation.update({
      where: { id: donationId },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      { error: `Payment failed with status: ${intent.status}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Stripe Charge] error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
