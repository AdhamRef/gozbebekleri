/**
 * Financial settlement guard for Stripe's one-time payment webhooks.
 * All existing one-time payment creators use Math.round(totalAmount * 100).
 * This guard deliberately matches that checkout contract; update both the
 * creators and guard together before enabling zero-decimal currencies.
 */
export function stripeOneTimePaymentMatchesDonation(
  donation: {
    totalAmount: number;
    currency: string;
    provider: string | null;
    providerOrderId: string | null;
    subscriptionId?: string | null;
  },
  payment: {
    id: string | null | undefined;
    amountMinor: number | null | undefined;
    currency: string | null | undefined;
  },
): boolean {
  if (donation.provider !== "STRIPE" || donation.subscriptionId) return false;
  if (!payment.id || donation.providerOrderId !== payment.id) return false;
  if (!Number.isFinite(donation.totalAmount) || donation.totalAmount <= 0) return false;

  const currency = donation.currency?.trim().toLowerCase();
  if (!currency || currency !== payment.currency?.trim().toLowerCase()) return false;

  const expectedMinor = Math.round(donation.totalAmount * 100);
  return (
    Number.isSafeInteger(expectedMinor) && expectedMinor > 0 &&
    typeof payment.amountMinor === "number" &&
    Number.isSafeInteger(payment.amountMinor) &&
    payment.amountMinor === expectedMinor
  );
}
