import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("[Stripe Subscribe] STRIPE_SECRET_KEY is not set");
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

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
        subscription: true,
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
    const productName = campaignNames || categoryNames || "Monthly Donation";

    // Create a Stripe Customer for this subscription
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    const customerId = customer.id;

    const product = await stripe.products.create({ name: productName });
    const priceData = {
      currency,
      product: product.id,
      unit_amount: amountInSmallestUnit,
      recurring: { interval: "month" as const },
    };

    // Create subscription with incomplete payment — client confirms with card data.
    // Stripe renews automatically one month from the first successful charge.
    // save_default_payment_method stores the card for all future recurring charges.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { price_data: priceData as any },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        donationId,
        userId: session.user.id,
        ...(donation.subscriptionId ? { subscriptionDbId: donation.subscriptionId } : {}),
      },
    });

    // Store Stripe subscription ID in payforToken field so webhook can find it
    if (donation.subscriptionId) {
      await prisma.subscription.update({
        where: { id: donation.subscriptionId },
        data: { payforToken: subscription.id },
      });
    }

    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent: Stripe.PaymentIntent | null;
    };
    const clientSecret = invoice?.payment_intent?.client_secret;

    if (!clientSecret) {
      return NextResponse.json({ error: "Could not get payment intent" }, { status: 500 });
    }

    // Store the first invoice ID as providerOrderId.
    // The webhook (invoice.payment_succeeded) uses this for idempotency — it will find
    // this PENDING donation by invoice ID and mark it PAID instead of creating a duplicate.
    await prisma.donation.update({
      where: { id: donationId },
      data: { provider: "STRIPE", providerOrderId: invoice.id || subscription.id, locale },
    });

    return NextResponse.json({ clientSecret });
  } catch (error) {
    console.error("[Stripe Subscribe] error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
