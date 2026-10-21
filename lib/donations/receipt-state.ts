/** Subscription activity and the existence of a record do not confirm payment. */
export function hasConfirmedDonationPayment(donation: { status?: unknown } | null | undefined): boolean {
  return donation?.status === "PAID";
}
