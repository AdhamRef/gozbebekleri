/**
 * Stripe is the source of truth for a subscription billing period and status.
 * Never derive the next charge date by adding a month to when an invoice
 * happened to be paid (late payments drift from the provider's actual anchor).
 */
export type StripeBillingSnapshot = {
  status: string;
  current_period_end?: number | null;
  items?: { data?: Array<{ current_period_end?: number | null }> };
};

export function stripeBillingState(snapshot: StripeBillingSnapshot) {
  const periods = [
    ...(snapshot.items?.data ?? []).map((item) => item.current_period_end),
    snapshot.current_period_end,
  ].filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  const nextBillingDate =
    periods.length > 0 ? new Date(Math.min(...periods) * 1000) : null;
  const status: "CANCELLED" | "PAUSED" | "PAYMENT_FAILED" | "ACTIVE" | null = snapshot.status === "canceled" ? "CANCELLED"
    : snapshot.status === "paused" ? "PAUSED"
    : ["past_due","unpaid","incomplete","incomplete_expired"].includes(snapshot.status) ? "PAYMENT_FAILED"
    : ["active","trialing"].includes(snapshot.status) ? "ACTIVE"
    : null;
  return { status, nextBillingDate };
}
