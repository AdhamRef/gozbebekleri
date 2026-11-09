/** Checkout presentation only; never round or mutate the submitted donation amount. */
export function formatCheckoutAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(amount);
}
