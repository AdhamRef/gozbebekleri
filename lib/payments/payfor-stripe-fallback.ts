import { after } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { dispatchDonationPaid } from "@/lib/events/dispatch";
import { consumeFallbackCard, discardFallbackCard, type FallbackCard } from "@/lib/payments/fallback-card";
import {
  PAID_AT_UNSET,
  markDonationFailedFinal,
  markDonationPaidByStripeIntent,
} from "@/lib/payments/donation-outcome";

/**
 * Gateway routing for one-time card donations:
 *   1. PayFor (3D Secure), any currency — PayFor initiate converts to TRY.
 *   2. If PayFor declines, the SAME donation (same amount, currency, items, donor)
 *      is sent to Stripe:
 *        - raw-card mode (only when PAYFOR_RAW_CARD_FALLBACK is on): the stashed card
 *          is charged server-side with no donor action. Needs Stripe's "raw card data"
 *          access — without it Stripe rejects every attempt, which is why it is opt-in.
 *        - otherwise (default): the donor is redirected straight to Stripe's hosted
 *          Checkout for that donation and only re-types the card.
 *   3. /donation-failed only when Stripe fails too (or the donor leaves Checkout).
 *
 * Monthly donations are Stripe-only and never come through here.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

/** Opt-in: charge the PayFor card on Stripe automatically. Off until Stripe enables raw card data. */
export function rawCardFallbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYFOR_RAW_CARD_FALLBACK === "true";
}

/** Currencies Stripe charges in whole units (no ×100). */
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function stripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100);
}

type Urls = { success: string; failed: string; returnUrl: string; checkoutCancel: string };

function urlsFor(origin: string, locale: string, donationId: string): Urls {
  const id = encodeURIComponent(donationId);
  const loc = encodeURIComponent(locale);
  return {
    success: `${origin}/${loc}/success/${id}`,
    failed: `${origin}/${loc}/donation-failed?donationId=${id}`,
    returnUrl: `${origin}/api/stripe/fallback/return?donationId=${id}&locale=${loc}`,
    checkoutCancel: `${origin}/api/stripe/fallback/cancel?donationId=${id}&locale=${loc}`,
  };
}

function combinedFailureMessage(payforError: string | null | undefined, stripeError: string): string {
  return payforError ? `PayFor: ${payforError} | Stripe: ${stripeError}` : `Stripe: ${stripeError}`;
}

async function loadForStripe(donationId: string) {
  return prisma.donation.findUniqueOrThrow({
    where: { id: donationId },
    include: {
      items: { include: { campaign: { select: { title: true } } } },
      categoryItems: { include: { category: { select: { name: true } } } },
      donor: { select: { email: true } },
    },
  });
}

function describe(donation: Awaited<ReturnType<typeof loadForStripe>>): string {
  return (
    donation.items.map((i) => i.campaign.title).join(", ") ||
    donation.categoryItems.map((i) => i.category.name).join(", ") ||
    "Donation"
  );
}

/** Record that Stripe now owns this donation (webhook, reconciler and concurrent callbacks rely on it). */
async function recordStripeHandoff(donationId: string, providerOrderId: string) {
  await prisma.donation.updateMany({
    where: { id: donationId, ...PAID_AT_UNSET },
    data: { provider: "STRIPE", providerOrderId },
  });
}

// ─────────────────────────────────────────── raw-card (automatic) mode ──

/**
 * Turn a raw-card fallback PaymentIntent's state into where the browser goes next,
 * crediting or failing the donation as needed.
 */
export async function resolveFallbackIntent(
  donationId: string,
  intent: Stripe.PaymentIntent,
  urls: Urls
): Promise<string> {
  if (intent.status === "succeeded") {
    if (await markDonationPaidByStripeIntent(donationId, intent)) {
      after(() => dispatchDonationPaid(donationId));
    }
    return urls.success;
  }
  // Card payments are rarely "processing"; the webhook / reconciler finish them.
  if (intent.status === "processing") return urls.success;

  if (intent.status === "requires_action") {
    const redirect = intent.next_action?.redirect_to_url?.url;
    if (redirect) return redirect; // Stripe's 3D Secure page → back to returnUrl
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { providerErrorMessage: true },
  });
  const stripeError = intent.last_payment_error?.message ?? `payment ${intent.status}`;
  await markDonationFailedFinal(donationId, {
    provider: "STRIPE",
    providerOrderId: intent.id,
    errorMessage: combinedFailureMessage(donation?.providerErrorMessage, stripeError),
    raw: intent,
  });
  return urls.failed;
}

async function chargeStashedCard(
  donationId: string,
  card: FallbackCard,
  returnUrl: string
): Promise<Stripe.PaymentIntent> {
  const donation = await loadForStripe(donationId);
  const currency = (donation.currency || "USD").toLowerCase();

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { number: card.number, exp_month: card.expMonth, exp_year: card.expYear, cvc: card.cvc },
    ...(card.holder ? { billing_details: { name: card.holder } } : {}),
  });

  const intent = await stripe.paymentIntents.create({
    amount: stripeAmount(donation.totalAmount, currency),
    currency,
    description: describe(donation),
    payment_method: paymentMethod.id,
    payment_method_types: ["card"],
    confirm: true,
    // Redirect-based 3DS, so the server can send the browser straight to it.
    return_url: returnUrl,
    metadata: { donationId, payforFallback: "true" },
  });
  await recordStripeHandoff(donationId, intent.id);
  return intent;
}

// ───────────────────────────────────────────── hosted Checkout (default) ──

/**
 * Hosted Stripe Checkout for the same donation. Outcome is handled by the existing
 * webhook: checkout.session.completed credits it; checkout.session.expired (30 min)
 * fails it. The donor leaving via "back" hits /api/stripe/fallback/cancel.
 */
async function startCheckout(donationId: string, urls: Urls): Promise<string> {
  const donation = await loadForStripe(donationId);
  const currency = (donation.currency || "USD").toLowerCase();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: describe(donation), metadata: { donationId } },
          unit_amount: stripeAmount(donation.totalAmount, currency),
        },
        quantity: 1,
      },
    ],
    success_url: `${urls.success}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: urls.checkoutCancel,
    // donationId only on the session (not the PaymentIntent): a first declined card
    // inside Checkout must not fail the donation while the donor can still try again.
    metadata: { donationId, payforFallback: "checkout" },
    ...(donation.donor?.email ? { customer_email: donation.donor.email } : {}),
    // Stripe's minimum; abandoned fallbacks get failed by checkout.session.expired.
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    locale: "auto",
  });
  if (!session.url) throw new Error("Stripe Checkout returned no url");
  await recordStripeHandoff(donationId, session.id);
  return session.url;
}

// ─────────────────────────────────────────────────────────── entry points ──

/**
 * Called from the PayFor ok/fail callbacks when PayFor did NOT take the payment.
 * The caller has already recorded PayFor's error on the donation (without marking
 * it FAILED). Returns the URL to redirect the browser to.
 */
export async function handlePayForFailure(opts: {
  donationId: string;
  locale: string;
  origin: string;
  payforError: string;
}): Promise<string> {
  const { donationId, locale, origin, payforError } = opts;
  const urls = urlsFor(origin, locale, donationId);

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { paidAt: true, status: true, provider: true, providerOrderId: true, subscriptionId: true },
  });
  if (!donation) return urls.failed;
  if (donation.paidAt) return urls.success;
  // A concurrent callback already handed this donation to Stripe — don't start a
  // second charge or fail it here.
  if (donation.provider === "STRIPE" && donation.providerOrderId?.startsWith("pi_")) return urls.returnUrl;
  if (donation.provider === "STRIPE" && donation.providerOrderId?.startsWith("cs_")) return urls.failed;
  if (donation.status === "FAILED" || donation.subscriptionId) {
    await discardFallbackCard(donationId).catch(() => {});
    return urls.failed;
  }

  // 1) Automatic raw-card charge, when enabled and the card is still held.
  const card = rawCardFallbackEnabled() ? await consumeFallbackCard(donationId) : null;
  if (!rawCardFallbackEnabled()) await discardFallbackCard(donationId).catch(() => {});
  if (card) {
    try {
      const intent = await chargeStashedCard(donationId, card, urls.returnUrl);
      return await resolveFallbackIntent(donationId, intent, urls);
    } catch (error) {
      const stripeError = error instanceof Stripe.errors.StripeError ? error : null;
      console.error("[PayFor→Stripe raw-card fallback] failed — falling back to Checkout", {
        donationId, type: stripeError?.type, code: stripeError?.code, message: stripeError?.message ?? String(error),
      });
      // A real decline on the PaymentIntent is final; anything else (e.g. raw card
      // data not enabled) still gets the hosted Checkout below.
      if (stripeError?.payment_intent) {
        await markDonationFailedFinal(donationId, {
          provider: "STRIPE",
          providerOrderId: stripeError.payment_intent.id,
          errorMessage: combinedFailureMessage(payforError, stripeError.message),
          raw: stripeError.payment_intent,
        });
        return urls.failed;
      }
    }
  }

  // 2) Hosted Stripe Checkout for the same donation.
  try {
    return await startCheckout(donationId, urls);
  } catch (error) {
    console.error("[PayFor→Stripe Checkout fallback] could not start", {
      donationId, message: error instanceof Error ? error.message : String(error),
    });
    await markDonationFailedFinal(donationId, {
      provider: "PAYFOR",
      errorMessage: combinedFailureMessage(payforError, "checkout could not start"),
    });
    return urls.failed;
  }
}

/** Stripe 3DS return for the raw-card mode. */
export async function resolveFallbackReturn(opts: {
  donationId: string;
  locale: string;
  origin: string;
}): Promise<string> {
  const urls = urlsFor(opts.origin, opts.locale, opts.donationId);
  const donation = await prisma.donation.findUnique({
    where: { id: opts.donationId },
    select: { paidAt: true, providerOrderId: true },
  });
  if (!donation) return urls.failed;
  if (donation.paidAt) return urls.success;
  if (!donation.providerOrderId?.startsWith("pi_")) return urls.failed;

  const intent = await stripe.paymentIntents.retrieve(donation.providerOrderId);
  if (intent.metadata?.donationId !== opts.donationId) return urls.failed;
  // Don't bounce the donor back into 3DS from the return page — if Stripe still
  // wants action after they came back, the attempt is over. Cancel it so it can't
  // complete after we've shown the failure page.
  if (intent.status === "requires_action") {
    try {
      const canceled = await stripe.paymentIntents.cancel(intent.id);
      return resolveFallbackIntent(opts.donationId, canceled, urls);
    } catch {
      return resolveFallbackIntent(opts.donationId, { ...intent, status: "canceled" }, urls);
    }
  }
  return resolveFallbackIntent(opts.donationId, intent, urls);
}

/** Donor pressed "back" on the fallback Stripe Checkout: both gateways tried → failed. */
export async function resolveCheckoutCancel(opts: {
  donationId: string;
  locale: string;
  origin: string;
}): Promise<string> {
  const urls = urlsFor(opts.origin, opts.locale, opts.donationId);
  const donation = await prisma.donation.findUnique({
    where: { id: opts.donationId },
    select: { paidAt: true, providerOrderId: true, providerErrorMessage: true },
  });
  if (!donation) return urls.failed;
  if (donation.paidAt) return urls.success;
  if (!donation.providerOrderId?.startsWith("cs_")) return urls.failed;

  const session = await stripe.checkout.sessions.retrieve(donation.providerOrderId);
  if (session.metadata?.donationId !== opts.donationId) return urls.failed;
  if (session.payment_status === "paid") return urls.success; // webhook credits it
  if (session.status === "open") {
    await stripe.checkout.sessions.expire(session.id).catch(() => {});
  }
  await markDonationFailedFinal(opts.donationId, {
    provider: "STRIPE",
    providerOrderId: session.id,
    errorMessage: combinedFailureMessage(donation.providerErrorMessage, "donor left Stripe checkout"),
  });
  return urls.failed;
}
