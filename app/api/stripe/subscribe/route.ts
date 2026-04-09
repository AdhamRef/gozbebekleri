import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// POST /api/stripe/subscribe
// Create a Stripe Subscription directly (no Checkout redirect).
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

    // Get or create Stripe Customer for this user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, stripeCustomerId: true } as never,
    });

    let customerId: string;
    const stripeCustomerId = (user as { stripeCustomerId?: string | null })?.stripeCustomerId;

    if (stripeCustomerId) {
      customerId = stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      // Persist customer ID — ignore if column doesn't exist on the schema
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { stripeCustomerId: customerId } as never,
        });
      } catch {
        // Column may not exist yet; non-fatal
      }
    }

    // Attach the payment method to the customer and set as default
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch {
      // Already attached — fine
    }
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the subscription with incomplete payment behaviour so we get a client_secret
    // Create a one-off price inline — Stripe's SubscriptionCreateParams.Item requires
    // price_data to be typed as SubscriptionItemCreateParams.PriceData which uses
    // product_data. Cast to satisfy the SDK's strict types.
    const priceData = {
      currency,
      product_data: { name: productName },
      unit_amount: amountInSmallestUnit,
      recurring: { interval: "month" as const },
    };

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

    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent: Stripe.PaymentIntent | null;
    };

    const paymentIntent = invoice?.payment_intent;

    // Update donation with provider info
    await prisma.donation.update({
      where: { id: donationId },
      data: {
        provider: "STRIPE",
        providerOrderId: subscription.id,
        locale,
      },
    });

    if (paymentIntent?.status === "succeeded") {
      await prisma.donation.update({
        where: { id: donationId },
        data: { status: "PAID" },
      });
      return NextResponse.json({ status: "succeeded" });
    }

    if (
      paymentIntent?.status === "requires_action" ||
      paymentIntent?.status === "requires_confirmation"
    ) {
      return NextResponse.json({
        status: "requires_action",
        clientSecret: paymentIntent.client_secret,
      });
    }

    if (paymentIntent?.status === "requires_payment_method") {
      return NextResponse.json(
        { error: "Card was declined. Please try a different card." },
        { status: 400 }
      );
    }

    // Fallback — return clientSecret so frontend can attempt confirm
    return NextResponse.json({
      status: paymentIntent?.status ?? subscription.status,
      clientSecret: paymentIntent?.client_secret ?? null,
    });
  } catch (error) {
    console.error("[Stripe Subscribe] error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
