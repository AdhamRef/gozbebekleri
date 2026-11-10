import { stripeAmountInMinorUnits } from "./stripe-minor-units";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { stripeOneTimePaymentMatchesDonation } from "@/lib/donations/stripe-one-time-payment";

/**
 * Stripe keeps idempotency results for at least 24 hours; do not reuse the
 * key near its retention boundary. After 20 hours we may only bind positive
 * provider evidence, never issue another create after a negative search.
 */
export const STRIPE_CHARGE_REPLAY_WINDOW_MS = 20 * 60 * 60 * 1000;
export const STRIPE_CHARGE_RESERVATION_PREFIX = "goz_charge_reserved_";
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StripeChargeAttempt = {
  version: 1;
  attemptId: string;
  donationId: string;
  donorId: string;
  startedAt: number;
  amountMinor: number;
  currency: string;
  description: string;
};

export type ChargeDonation = {
  id: string;
  donorId: string;
  totalAmount: number;
  currency: string;
  provider: string | null;
  providerOrderId: string | null;
  subscriptionId?: string | null;
  stripeChargeAttempt?: unknown;
};

type VerifiedIntent = Pick<Stripe.PaymentIntent,
  "id" | "amount" | "amount_received" | "currency" | "metadata" | "status" | "client_secret">;

export function stripeChargeReservationId(donationId: string) {
  return STRIPE_CHARGE_RESERVATION_PREFIX + donationId;
}

export function createStripeChargeAttempt(
  donation: Pick<ChargeDonation, "id" | "donorId" | "totalAmount" | "currency">,
  description: string,
  now: number = Date.now(),
): StripeChargeAttempt {
  const amountMinor = stripeAmountInMinorUnits(donation.totalAmount, donation.currency);
  const currency = donation.currency.trim().toLowerCase();
  if (!OBJECT_ID.test(donation.id) || !OBJECT_ID.test(donation.donorId) ||
      !Number.isSafeInteger(amountMinor) || amountMinor <= 0 ||
      !/^[a-z]{3}$/.test(currency) || !Number.isFinite(now)) {
    throw new Error("INVALID_STRIPE_CHARGE_ATTEMPT");
  }
  return {
    version: 1, attemptId: randomUUID(),
    donationId: donation.id, donorId: donation.donorId,
    startedAt: Math.floor(now), amountMinor, currency,
    // Persist the ORIGINAL Stripe request description. Do not recompute it
    // from renamed projects on retry or Stripe will reject idempotency.
    description: description.slice(0, 490) || "Donation",
  };
}

export function readStripeChargeAttempt(raw: unknown, donation: ChargeDonation): StripeChargeAttempt | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const a = raw as Partial<StripeChargeAttempt>;
  if (a.version !== 1 || typeof a.attemptId !== "string" || !UUID.test(a.attemptId) ||
      a.donationId !== donation.id || a.donorId !== donation.donorId ||
      !Number.isSafeInteger(a.startedAt) || (a.startedAt ?? 0) <= 0 ||
      !Number.isSafeInteger(a.amountMinor) || (a.amountMinor ?? 0) <= 0 ||
      typeof a.currency !== "string" || !/^[a-z]{3}$/.test(a.currency) ||
      typeof a.description !== "string" || !a.description ||
      a.description.length > 490) return null;
  let current: number;
  try { current = stripeAmountInMinorUnits(donation.totalAmount, donation.currency); } catch { return null; }
  if (!Number.isSafeInteger(current) || current !== a.amountMinor ||
      donation.currency.toLowerCase() !== a.currency) return null;
  return a as StripeChargeAttempt;
}

export function mayReplayStripeChargeAttempt(attempt: StripeChargeAttempt, now = Date.now()): boolean {
  const elapsed = now - attempt.startedAt;
  // A future timestamp or a pruned key is never evidence that creation is safe.
  return elapsed >= 0 && elapsed < STRIPE_CHARGE_REPLAY_WINDOW_MS;
}

export function stripeChargeIdempotencyKey(attempt: StripeChargeAttempt): string {
  return "goz-charge-v2-" + attempt.donationId + "-" + attempt.attemptId;
}

export function stripeChargeCreateParams(attempt: StripeChargeAttempt): Stripe.PaymentIntentCreateParams {
  return {
    amount: attempt.amountMinor,
    currency: attempt.currency,
    description: attempt.description,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: {
      donationId: attempt.donationId,
      userId: attempt.donorId,
      chargeAttemptId: attempt.attemptId,
    },
  };
}

/** Check returned provider truth, never assume a search miss proves absence. */
export function stripeIntentMatchesAttempt(intent: VerifiedIntent, attempt: StripeChargeAttempt): boolean {
  return Boolean(
    /^pi_[a-zA-Z0-9_]+$/.test(intent.id) &&
    intent.amount === attempt.amountMinor &&
    intent.currency?.toLowerCase() === attempt.currency &&
    intent.metadata?.donationId === attempt.donationId &&
    intent.metadata?.userId === attempt.donorId &&
    intent.metadata?.chargeAttemptId === attempt.attemptId &&
    (intent.status !== "succeeded" || intent.amount_received === attempt.amountMinor),
  );
}

/**
 * A signed webhook is allowed to bind a still-reserved attempt ONLY when the
 * provider matches its stored immutable nonce, owner, amount and currency.
 * Legacy already-bound Stripe intents retain the existing strict ID guard.
 */
export function stripeOneTimeIntentCanSettle(donation: ChargeDonation, intent: VerifiedIntent): boolean {
  if (donation.provider !== "STRIPE" || donation.subscriptionId) return false;
  if (intent.status !== "succeeded" || intent.metadata?.donationId !== donation.id) return false;
  const attempt = readStripeChargeAttempt(donation.stripeChargeAttempt, donation);
  if (donation.stripeChargeAttempt && !attempt) return false;
  if (attempt && !stripeIntentMatchesAttempt(intent, attempt)) return false;

  if (donation.providerOrderId === intent.id) {
    return stripeOneTimePaymentMatchesDonation(donation, {
      id: intent.id, amountMinor: intent.amount_received, currency: intent.currency,
    });
  }
  return donation.providerOrderId === stripeChargeReservationId(donation.id) &&
    attempt !== null && stripeIntentMatchesAttempt(intent, attempt);
}
