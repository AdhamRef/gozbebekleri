/**
 * A Checkout Session is authoritative only for one-time payments.
 * Stripe subscription checkouts are settled by invoice.payment_succeeded.
 * The checkout event may arrive first, last, more than once, or with an
 * unpaid / no_payment_required status; none proves the subscription invoice.
 */
export function checkoutPaymentCanSettle(
  mode: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  return mode === "payment" && paymentStatus === "paid";
}

/**
 * Resolve an out-of-order invoice webhook to a locally owned subscription
 * only when Stripe's subscription metadata matches our donor and the
 * persisted Stripe binding is absent or already equal. Never rebind a
 * subscription to a different external Stripe subscription.
 */
export function stripeSubscriptionOwnershipMatches(
  candidate: { donorId: string; payforToken?: string | null } | null,
  stripeSubscriptionId: string,
  metadata: { subscriptionDbId?: string; userId?: string },
  candidateDbId: string,
): boolean {
  return Boolean(
    candidate &&
    metadata.subscriptionDbId === candidateDbId &&
    metadata.userId &&
    candidate.donorId === metadata.userId &&
    (!candidate.payforToken || candidate.payforToken === stripeSubscriptionId),
  );
}
