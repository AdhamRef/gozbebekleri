import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// POST /api/stripe/subscribe
// Creates a Stripe Subscription for the given donation and returns the clientSecret
// of the subscription's first invoice PaymentIntent.
// The client then calls stripe.confirmCardPayment(clientSecret, { payment_method: { card: rawData } })
// which also saves the card for future monthly billing.
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

    // Get or create Stripe Customer (no payment method yet — card attached on confirmation)
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
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { stripeCustomerId: customerId } as never,
        });
      } catch {
        // Column may not exist yet; non-fatal
      }
    }

    const priceData = {
      currency,
      product_data: { name: productName },
      unit_amount: amountInSmallestUnit,
      recurring: { interval: "month" as const },
    };

    // Compute billing_cycle_anchor = next billing day (next calendar month).
    // e.g. today = Apr 5, billingDay = 19 → anchor = May 19 00:00 UTC
    // This tells Stripe: charge immediately (first invoice = today),
    // then charge again on May 19, June 19, July 19, etc.
    const bd = donation.subscription?.billingDay;
    const nowForAnchor = new Date();
    const anchorDate = new Date(Date.UTC(
      nowForAnchor.getUTCFullYear(),
      nowForAnchor.getUTCMonth() + 1,
      1,
    ));
    if (bd != null && bd >= 1 && bd <= 31) {
      const lastDay = new Date(Date.UTC(
        anchorDate.getUTCFullYear(),
        anchorDate.getUTCMonth() + 1,
        0,
      )).getUTCDate();
      anchorDate.setUTCDate(Math.min(bd, lastDay));
    }
    anchorDate.setUTCHours(0, 0, 0, 0);
    const billingCycleAnchor = Math.floor(anchorDate.getTime() / 1000);

    // Create subscription with incomplete payment — client confirms with card data.
    // billing_cycle_anchor ensures future charges happen on the chosen billing day.
    // proration_behavior: "none" so Stripe charges the full amount immediately (not prorated).
    // save_default_payment_method stores the card for all future recurring charges.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { price_data: priceData as any },
      ],
      billing_cycle_anchor: billingCycleAnchor,
      proration_behavior: "none",
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
