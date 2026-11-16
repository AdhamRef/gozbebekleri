import { after } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { dispatchDonationPaid } from "@/lib/events/dispatch";
import { consumeFallbackCard, type FallbackCard } from "@/lib/payments/fallback-card";
import { markDonationFailedFinal, markDonationPaidByStripeIntent } from "@/lib/payments/donation-outcome";

/**
 * Gateway routing for one-time card donations:
 *   1. PayFor (3D Secure), any currency — PayFor initiate converts to TRY.
 *   2. If PayFor fails, the SAME card is charged on Stripe in the donation's own
 *      currency, without the donor doing anything (card stashed at initiate, see
 *      lib/payments/fallback-card.ts).
 *   3. Only when Stripe fails too does the donor land on /donation-failed.
 *
 * Monthly donations are Stripe-only and never come through here (PayFor has no
 * recurring billing).
 *
 * Requires "raw card data" access on the Stripe account. Without it Stripe rejects
 * the card number and the fallback fails cleanly → /donation-failed, as before.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

/** Currencies Stripe charges in whole units (no ×100). */
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function stripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100);
}

type Urls = { success: string; failed: string; returnUrl: string };

function urlsFor(origin: string, locale: string, donationId: string): Urls {
  const id = encodeURIComponent(donationId);
  const loc = encodeURIComponent(locale);
  return {
    success: `${origin}/${loc}/success/${id}`,
    failed: `${origin}/${loc}/donation-failed?donationId=${id}`,
    returnUrl: `${origin}/api/stripe/fallback/return?donationId=${id}&locale=${loc}`,
  };
}

function combinedFailureMessage(payforError: string | null | undefined, stripeError: string): string {
  return payforError ? `PayFor: ${payforError} | Stripe: ${stripeError}` : `Stripe: ${stripeError}`;
}

/**
 * Turn a fallback PaymentIntent's state into where the browser goes next,
 * crediting or failing the donation as needed. Shared by the PayFor callbacks
 * and the Stripe 3DS return route.
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

async function chargeOnStripe(
  donationId: string,
  card: FallbackCard,
  returnUrl: string
): Promise<Stripe.PaymentIntent> {
  const donation = await prisma.donation.findUniqueOrThrow({
    where: { id: donationId },
    include: {
      items: { include: { campaign: { select: { title: true } } } },
      categoryItems: { include: { category: { select: { name: true } } } },
    },
  });
  const currency = (donation.currency || "USD").toLowerCase();
  const description =
    donation.items.map((i) => i.campaign.title).join(", ") ||
    donation.categoryItems.map((i) => i.category.name).join(", ") ||
    "Donation";

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: {
      number: card.number,
      exp_month: card.expMonth,
      exp_year: card.expYear,
      cvc: card.cvc,
    },
    ...(card.holder ? { billing_details: { name: card.holder } } : {}),
  });

  const intent = await stripe.paymentIntents.create({
    amount: stripeAmount(donation.totalAmount, currency),
    currency,
    description,
    payment_method: paymentMethod.id,
    payment_method_types: ["card"],
    confirm: true,
    // Redirect-based 3DS, so the server can send the browser straight to it.
    return_url: returnUrl,
    metadata: { donationId, payforFallback: "true" },
  });

  // Record the hand-off so the webhook, the reconciler and a concurrent PayFor
  // callback all see this donation now belongs to Stripe.
  await prisma.donation.updateMany({
    where: { id: donationId, paidAt: null },
    data: { provider: "STRIPE", providerOrderId: intent.id },
  });
  return intent;
}

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
  payforRaw?: unknown;
}): Promise<string> {
  const { donationId, locale, origin, payforError } = opts;
  const urls = urlsFor(origin, locale, donationId);

  const card = await consumeFallbackCard(donationId);
  if (!card) {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { paidAt: true, provider: true, providerOrderId: true },
    });
    if (donation?.paidAt) return urls.success;
    // A concurrent callback already handed this donation to Stripe — let the
    // return route report Stripe's real state instead of failing it here.
    if (donation?.provider === "STRIPE" && donation.providerOrderId?.startsWith("pi_")) {
      return urls.returnUrl;
    }
    // No card to retry with (expired, saved-card without CVC, etc.): PayFor's
    // failure is final, exactly as before the fallback existed.
    await markDonationFailedFinal(donationId, {
      provider: "PAYFOR",
      errorMessage: payforError,
      ...(opts.payforRaw !== undefined ? { raw: opts.payforRaw } : {}),
    });
    return urls.failed;
  }

  try {
    const intent = await chargeOnStripe(donationId, card, urls.returnUrl);
    return await resolveFallbackIntent(donationId, intent, urls);
  } catch (error) {
    // Declines surface as thrown StripeCardError; the intent (if any) is attached.
    const stripeError = error instanceof Stripe.errors.StripeError ? error : null;
    const intent = stripeError?.payment_intent;
    console.error("[PayFor→Stripe fallback] failed", {
      donationId,
      type: stripeError?.type,
      code: stripeError?.code,
      message: stripeError?.message ?? String(error),
    });
    await markDonationFailedFinal(donationId, {
      provider: intent ? "STRIPE" : "PAYFOR",
      providerOrderId: intent?.id ?? null,
      errorMessage: combinedFailureMessage(payforError, stripeError?.message ?? "fallback error"),
      ...(intent ? { raw: intent } : {}),
    });
    return urls.failed;
  }
}

/** Used by the Stripe 3DS return route. */
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
  // wants action after they came back, the attempt is over.
  // Cancel it so it can't complete after we've shown the failure page.
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
