/** Only provider/finance-confirmed donations may issue PDF receipts.
 * Checkout creates PAID as an optimistic placeholder with paidAt unset.
 * Runtime DB Date and read-only JSON API ISO timestamps are both supported.
 */
export function hasConfirmedDonationPayment(
  donation: { status?: unknown; paidAt?: Date | string | null } | null | undefined,
): boolean {
  if (donation?.status !== "PAID" || !donation.paidAt) return false;
  if (donation.paidAt instanceof Date) return Number.isFinite(donation.paidAt.getTime());
  return typeof donation.paidAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(donation.paidAt) &&
    Number.isFinite(new Date(donation.paidAt).getTime());
}
