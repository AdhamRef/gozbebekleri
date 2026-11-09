/**
 * One shared finance projection for donor profile, reports and charts.
 * Values remain settled GROSS (historical original), REFUNDED, NET.
 * amountUSD is the original cause-only USD snapshot; don't use current FX.
 */
export type RefundedDonationView = {
  amount: number;
  amountUSD: number | null;
  currency: string;
  totalAmount: number;
  teamSupport: number;
  fees: number;
  refundedAmountUSD?: number | null;
  refundedTotalAmount?: number | null;
  refundedTotalUSD?: number | null;
  refundedTeamSupport?: number | null;
  refundedFees?: number | null;
};
const money = (n: number) => Math.round(n * 100) / 100;
const positive = (n: number | undefined | null) => typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
export function donationGrossRefundNet(row: RefundedDonationView) {
  // USD-native donation.amount is the cause itself; older rows sometimes stored
  // amountUSD as the total charged including team support, so never trust that
  // field over the native USD amount. Non-USD requires recorded historical FX.
  const grossCauseUSD = row.currency.toUpperCase() === "USD"
    ? positive(row.amount) : positive(row.amountUSD);
  // Exact historical USD price of this charge; never fetch/guess new rates.
  const grossChargedUSD = row.amount > 0 && grossCauseUSD > 0
    ? money(row.totalAmount * grossCauseUSD / row.amount) : 0;
  const refundedCauseUSD = money(positive(row.refundedAmountUSD));
  const refundedChargedUSD = money(positive(row.refundedTotalUSD));
  const refundedLocal = money(positive(row.refundedTotalAmount));
  return {
    grossCauseUSD: money(grossCauseUSD),
    refundedCauseUSD,
    netCauseUSD: money(Math.max(0, grossCauseUSD - refundedCauseUSD)),
    grossChargedUSD,
    refundedChargedUSD,
    netChargedUSD: money(Math.max(0, grossChargedUSD - refundedChargedUSD)),
    grossLocal: money(row.totalAmount),
    refundedLocal,
    netLocal: money(Math.max(0, row.totalAmount - refundedLocal)),
    refundedTeamSupportLocal: money(positive(row.refundedTeamSupport)),
    refundedFeesLocal: money(positive(row.refundedFees)),
  };
}
