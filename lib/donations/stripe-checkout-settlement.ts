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
