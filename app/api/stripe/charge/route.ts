import { enforcePaymentInitiationBudget } from "@/lib/site-security/payment-initiation-budget";
import { hasGuestPaymentGrant } from "@/lib/donations/guest-payment-grant";
import { donationFieldEmpty } from "@/lib/donations/mongo-null";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// A distinct, non-provider reference prevents concurrent requests from
// creating competing PaymentIntents. It is never interpreted as a paid charge.
const reserveId = (donationId: string) => `goz_charge_reserved_${donationId}`;
const noStore = { "Cache-Control": "no-store" };
function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

// POST /api/stripe/charge: authenticated donor or specifically authorized
// guest, never a donorId guessed from the public donation identifier.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as { donationId?: string; locale?: string };
    const donationId = String(body.donationId || "").trim();
    if (!/^[a-f0-9]{24}$/i.test(donationId)) {
      return errorResponse("Invalid donationId", 400);
    }
    const abuseLimit = await enforcePaymentInitiationBudget(req, donationId);
    if (abuseLimit) return abuseLimit;

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        items: { include: { campaign: { select: { title: true } } } },
        categoryItems: { include: { category: { select: { name: true } } } },
      },
    });
    if (!donation) return errorResponse("Donation not found", 404);

    const allowed = session?.user?.id
      ? donation.donorId === session.user.id
      : hasGuestPaymentGrant(req, donationId);
    if (!allowed) return errorResponse("Forbidden", 403);

    // Settlement is a provider-confirmed state. Never initialize or rebind a
    // settled, failed, subscription, or non-card donation.
    if (donation.paidAt || donation.status === "FAILED" ||
        donation.subscriptionId || donation.paymentMethod !== "CARD") {
      return errorResponse("Donation is not eligible for one-time card payment", 409);
    }

    const existingReference = donation.providerOrderId;
    if (existingReference) {
      // Authorized retries cannot replace an in-flight or different provider
      // reference. A completed Stripe intent is reusable by its same owner.
      if (donation.provider === "STRIPE" && existingReference.startsWith("pi_")) {
        const existing = await stripe.paymentIntents.retrieve(existingReference);
        const expected = Math.round(donation.totalAmount * 100);
        if (existing.id !== existingReference ||
            existing.metadata?.donationId !== donationId ||
            existing.amount !== expected ||
            existing.currency.toLowerCase() !== donation.currency.toLowerCase() ||
            existing.status === "succeeded" || existing.status === "canceled") {
          return errorResponse("Existing payment requires review", 409);
        }
        return NextResponse.json({ clientSecret: existing.client_secret }, { headers: noStore });
      }
      return errorResponse("Payment initiation already in progress or bound", 409);
    }

    if (donation.provider && donation.provider !== "STRIPE") {
      return errorResponse("Donation bound to another payment provider", 409);
    }

    const locale = (body.locale ?? donation.locale ?? "en").toLowerCase();
    const currency = (donation.currency || "USD").toLowerCase();
    const amountInSmallestUnit = Math.round(donation.totalAmount * 100);
    if (!Number.isSafeInteger(amountInSmallestUnit) || amountInSmallestUnit <= 0) {
      return errorResponse("Invalid donation amount", 422);
    }

    const reservation = reserveId(donationId);
    // CAS: only one request can reserve an unbound donation, even across
    // concurrent serverless instances. MongoDB absent and explicit-null fields
    // both need matching (see donationFieldEmpty).
    const locked = await prisma.donation.updateMany({
      where: {
        AND: [
          { id: donationId, donorId: donation.donorId, status: "PAID", subscriptionId: null },
          donationFieldEmpty("paidAt"),
          donationFieldEmpty("providerOrderId"),
          { OR: [{ provider: null }, { provider: "STRIPE" }] },
        ],
      },
      data: { provider: "STRIPE", providerOrderId: reservation, locale },
    });
    if (locked.count !== 1) {
      return errorResponse("Payment initiation already in progress", 409);
    }

    const campaignNames = donation.items.map((i) => i.campaign.title).join(", ");
    const categoryNames = donation.categoryItems.map((i) => i.category.name).join(", ");
    const description = campaignNames || categoryNames || "Donation";
    // A deterministic idempotency key protects a request interrupted before
    // Stripe responds. Never issue another intent after reservation is lost.
    const intent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency,
      description,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { donationId, userId: donation.donorId },
    }, { idempotencyKey: `goz-one-time-charge-${donationId}` });

    const committed = await prisma.donation.updateMany({
      where: { AND: [
        { id: donationId, provider: "STRIPE", providerOrderId: reservation },
        donationFieldEmpty("paidAt"),
      ] },
      data: { providerOrderId: intent.id },
    });
    if (committed.count !== 1) {
      // Fail closed. Never return a client secret for a payment that the
      // donation record did not bind successfully.
      return errorResponse("Payment binding could not be confirmed", 409);
    }
    return NextResponse.json({ clientSecret: intent.client_secret }, { headers: noStore });
  } catch (error) {
    console.error("[Stripe Charge] error:", error);
    return errorResponse("Failed to create payment intent", 500);
  }
}
