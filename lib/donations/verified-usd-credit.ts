/**
 * Project and category progress is denominated in USD.
 * Never mistake a TRY/EUR/etc raw amount for USD when a conversion snapshot
 * is missing. No exchange rates are invented inside a payment webhook.
 */
export function verifiedUsdCredit(
  amount: number,
  amountUSD: number | null | undefined,
  currency: string | null | undefined,
): number | null {
  if (typeof amountUSD === "number" && Number.isFinite(amountUSD) && amountUSD >= 0) {
    return amountUSD;
  }
  if (currency?.trim().toUpperCase() === "USD" && Number.isFinite(amount) && amount >= 0) {
    return amount;
  }
  return null;
}
