import { enforcePaymentInitiationBudget } from "@/lib/site-security/payment-initiation-budget";
import { hasGuestPaymentGrant } from "@/lib/donations/guest-payment-grant";
import { donationFieldEmpty } from "@/lib/donations/mongo-null";
import {
  createStripeChargeAttempt, readStripeChargeAttempt, mayReplayStripeChargeAttempt,
  stripeChargeReservationId, stripeChargeIdempotencyKey,
  stripeChargeCreateParams, stripeIntentMatchesAttempt,
  type StripeChargeAttempt,
} from "@/lib/donations/stripe-charge-attempt";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const noStore = { "Cache-Control": "no-store" };
function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, {
    status, headers: { ...noStore, ...(status === 503 ? { "Retry-After": "5" } : {}) },
  });
}

/** Search is positive evidence only; an empty Stripe search never proves absence. */
async function findCreatedIntent(attempt: StripeChargeAttempt): Promise<Stripe.PaymentIntent | null> {
  const results = await stripe.paymentIntents.search({
    query: "metadata['chargeAttemptId']:'" + attempt.attemptId + "'",
    limit: 10,
  });
  if (results.has_more || results.data.length > 1) {
    throw new Error("STRIPE_CHARGE_ATTEMPT_AMBIGUOUS");
  }
  const found = results.data[0];
  if (!found) return null;
  // Stripe search may return delayed or stale data; re-read the specific intent.
  const verified = await stripe.paymentIntents.retrieve(found.id);
  if (!stripeIntentMatchesAttempt(verified, attempt)) {
    throw new Error("STRIPE_CHARGE_ATTEMPT_MISMATCH");
  }
  return verified;
}

async function commitVerifiedIntent(
  donationId: string,
  attempt: StripeChargeAttempt,
  intent: Stripe.PaymentIntent,
): Promise<NextResponse> {
  if (!stripeIntentMatchesAttempt(intent, attempt)) {
    return errorResponse("Stripe intent does not match original attempt", 409);
  }
  // Never return a payment secret for a successful/canceled intent, even if
  // its signed webhook is in flight. Stripe webhook owns booked revenue.
  if (intent.status === "succeeded" || intent.status === "canceled") {
    // Bind a valid successful intent so the already-in-flight webhook can
    // finish. Never overwrite a confirmed payment or different intent.
    await prisma.donation.updateMany({
      where: {
        AND: [
          { id: donationId, provider: "STRIPE",
            providerOrderId: stripeChargeReservationId(donationId) },
          donationFieldEmpty("paidAt"),
        ],
      },
      data: { providerOrderId: intent.id },
    });
    return errorResponse("Payment already completed or canceled; await confirmation", 409);
  }
  if (!intent.client_secret) return errorResponse("Stripe intent has no client secret", 409);
  const bound = await prisma.donation.updateMany({
    where: {
      AND: [
        { id: donationId, provider: "STRIPE",
          providerOrderId: stripeChargeReservationId(donationId) },
        donationFieldEmpty("paidAt"),
      ],
    },
    data: { providerOrderId: intent.id },
  });
  if (bound.count !== 1) {
    // Another recovery or a successful webhook could have won the race.
    // Query only; do not rebind or return an unauthorized client secret.
    const latest = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { providerOrderId: true, paidAt: true },
    });
    if (latest?.paidAt != null) return errorResponse("Payment already confirmed", 409);
    if (latest?.providerOrderId !== intent.id) {
      return errorResponse("Payment binding changed during recovery", 409);
    }
  }
  return NextResponse.json({ clientSecret: intent.client_secret }, { headers: noStore });
}

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
    if (donation.paidAt || donation.status !== "PAID" ||
        donation.subscriptionId || donation.paymentMethod !== "CARD") {
      return errorResponse("Donation is not eligible for one-time card payment", 409);
    }

    const ref = donation.providerOrderId;
    const attempt = readStripeChargeAttempt(donation.stripeChargeAttempt, donation);
    if (donation.stripeChargeAttempt && !attempt) {
      return errorResponse("Corrupt Stripe payment attempt requires review", 409);
    }

    if (ref && ref.startsWith("pi_") && donation.provider === "STRIPE") {
      const existing = await stripe.paymentIntents.retrieve(ref);
      if (attempt && !stripeIntentMatchesAttempt(existing, attempt)) {
        return errorResponse("Stripe payment does not match recorded attempt", 409);
      }
      const amountMinor = Math.round(donation.totalAmount * 100);
      if (existing.id !== ref || existing.metadata?.donationId !== donationId ||
          existing.amount !== amountMinor ||
          existing.currency?.toLowerCase() !== donation.currency.toLowerCase() ||
          existing.status === "succeeded" || existing.status === "canceled" ||
          !existing.client_secret) return errorResponse("Existing payment requires review", 409);
      return NextResponse.json({ clientSecret: existing.client_secret }, { headers: noStore });
    }
    const reserved = stripeChargeReservationId(donationId);
    if (ref && ref !== reserved) return errorResponse("Payment is already bound", 409);
    if (donation.provider && donation.provider !== "STRIPE") {
      return errorResponse("Donation bound to another payment provider", 409);
    }

    let snapshot = attempt;
    if (!ref) {
      if (attempt) return errorResponse("Conflicting existing payment attempt", 409);
      const campaignNames = donation.items.map(i => i.campaign.title).join(", ");
      const categoryNames = donation.categoryItems.map(i => i.category.name).join(", ");
      try {
        snapshot = createStripeChargeAttempt(
          donation, campaignNames || categoryNames || "Donation",
        );
      } catch {
        return errorResponse("Invalid donation amount or currency", 422);
      }
      const locale = (body.locale ?? donation.locale ?? "en").toLowerCase();
      // Atomic claim stores all retry inputs BEFORE contacting Stripe.
      const locked = await prisma.donation.updateMany({
        where: {
          AND: [
            { id: donationId, donorId: donation.donorId, status: "PAID" },
            donationFieldEmpty("subscriptionId"),
            donationFieldEmpty("paidAt"),
            donationFieldEmpty("providerOrderId"),
            { OR: [{ provider: null }, { provider: { isSet: false } }, { provider: "STRIPE" }] },
            { OR: [{ stripeChargeAttempt: { isSet: false } }, { stripeChargeAttempt: { equals: null } }] },
          ],
        },
        data: { provider: "STRIPE", providerOrderId: reserved,
                stripeChargeAttempt: snapshot as any, locale },
      });
      if (locked.count !== 1) {
        // Another request won; subsequent retry reads its immutable snapshot.
        return errorResponse("Payment creation is in progress", 503);
      }
    }
    if (!snapshot) {
      // Legacy reservation from before recovery support: no trustworthy
      // idempotency timestamp or nonce exists. Never create a new intent.
      return errorResponse("Legacy payment reservation requires manual review", 409);
    }

    // An eventual-consistency search can recover an intent even after Stripe
    // has pruned the idempotency key. A negative search is NEVER permission
    // to issue a fresh create after that expiry.
    const found = await findCreatedIntent(snapshot);
    if (found) return commitVerifiedIntent(donationId, snapshot, found);
    if (!mayReplayStripeChargeAttempt(snapshot)) {
      return errorResponse("Payment attempt expired; manual reconciliation required", 409);
    }

    // Within the conservative retention window only, replay the IDENTICAL
    // Stripe API request under the IDENTICAL key. A timeout leaves the
    // reservation and snapshot durable; a retry cannot mint a second intent.
    const intent = await stripe.paymentIntents.create(
      stripeChargeCreateParams(snapshot),
      { idempotencyKey: stripeChargeIdempotencyKey(snapshot) },
    );
    return commitVerifiedIntent(donationId, snapshot, intent);
  } catch (error) {
    console.error("[Stripe Charge] recovery temporarily unavailable", error);
    // Do not delete, replace or expire the immutable reservation on failures.
    return errorResponse("Payment recovery temporarily unavailable", 503);
  }
}
