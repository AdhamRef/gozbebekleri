export type ProfileDonationEvidence = {
  paymentStatus?: string | null;
  status?: string | null;
  paidAt?: string | Date | null;
  createdAt?: string | Date | null;
  subscriptionId?: string | null;
  billingReason?: string | null;
};

function validDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** A plan's ACTIVE status never proves that a payment attempt was collected. */
export function isSettledProfileDonation(donation: ProfileDonationEvidence): boolean {
  return (donation.paymentStatus ?? donation.status) === "PAID" && validDate(donation.paidAt) !== null;
}

/** Successful gifts belong to the date they were collected. Failed/pending
 * attempts keep their creation date so they remain visible in the history. */
export function profileDonationDate(donation: ProfileDonationEvidence): Date | null {
  return isSettledProfileDonation(donation) ? validDate(donation.paidAt) : validDate(donation.createdAt);
}

function monthKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`;
}

export function profileDonationMatchesPeriod(
  donation: ProfileDonationEvidence,
  period: string,
  now: Date,
  timeZone: string,
): boolean {
  if (period !== "month" && period !== "year") return true;
  const date = profileDonationDate(donation);
  if (!date) return false;
  const value = monthKey(date, timeZone), current = monthKey(now, timeZone);
  return period === "month" ? value === current : value.slice(0, 4) === current.slice(0, 4);
}

/** Calendar months of proven recurring giving, not attempts, elapsed duration,
 * or active plans. All cadences share a month; accelerated QA cycles do not
 * create ordinary donation months. The caller supplies the selected period. */
export function successfulRecurringMonthCount(donations: readonly ProfileDonationEvidence[], timeZone: string): number {
  const months = new Set<string>();
  for (const donation of donations) {
    if (!donation.subscriptionId || donation.billingReason === "subscription_test_cycle" || !isSettledProfileDonation(donation)) continue;
    months.add(monthKey(validDate(donation.paidAt)!, timeZone));
  }
  return months.size;
}

/** Distinct active plans with confirmed settled payments, rather than rows for each retry. */
export function activeConfirmedSubscriptionCount(donations: readonly ProfileDonationEvidence[]): number {
  const settled = new Set(donations.filter(d => d.subscriptionId && isSettledProfileDonation(d)).map(d => d.subscriptionId!));
  return new Set(donations.filter(d => d.subscriptionId && d.status === "ACTIVE" && settled.has(d.subscriptionId)).map(d => d.subscriptionId!)).size;
}

/**
 * Known settled USD value only. An unavailable FX conversion for EUR/TRY etc.
 * must not be displayed as an equal numeric number of dollars.
 * The caller can separately disclose missing FX instead of inventing revenue.
 */
export function settledProfileUsdValue(
  donation: ProfileDonationEvidence & { amountUSD?: number | null; totalAmount?: number | null; currency?: string | null },
): number {
  if (!isSettledProfileDonation(donation)) return 0;
  if (typeof donation.amountUSD === "number" && Number.isFinite(donation.amountUSD) && donation.amountUSD >= 0) return donation.amountUSD;
  if (donation.currency === "USD" && typeof donation.totalAmount === "number" && Number.isFinite(donation.totalAmount)) return donation.totalAmount;
  return 0;
}
