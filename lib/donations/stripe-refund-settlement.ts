import { Prisma, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { verifiedUsdCredit } from "@/lib/donations/verified-usd-credit";

type RefundSource = Pick<Stripe, "refunds" | "charges" | "paymentIntents" | "invoicePayments">;
type Db = PrismaClient;

export class StripeRefundReconciliationError extends Error {
  constructor(message: string, public readonly code: string, public readonly retryable = false) {
    super(message);
    this.name = "StripeRefundReconciliationError";
  }
}
const reject = (code: string, retryable = false): never => {
  throw new StripeRefundReconciliationError(code, code, retryable);
};
const idOf = (value: unknown): string | null =>
  typeof value === "string" ? value :
  value && typeof value === "object" && typeof (value as {id?: unknown}).id === "string"
    ? (value as {id: string}).id : null;
// Stripe uses zero-decimal minor units for these ISO currencies. Payments
// in TWD/HUF still have two decimals (payout rules are different).
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg",
  "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);
const minorFromMajor = (major: number, currency: string) =>
  Math.round(major * (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100));

/**
 * Strict financial policy:
 * - Source is the currently retrieved Stripe Refund, never an event's payload.
 * - Verify its charge, intent, invoice binding and captured amount before matching
 *   a single paid donation. Mismatched currencies / missing FX block settlement.
 * - Each Refund _id is unique; ledger and every increment share ONE transaction.
 * - A changed succeeded -> failed/canceled status reverses its previous impact;
 *   pending and unrecognized statuses never create a monetary adjustment.
 * - All allocations use the ORIGINAL paid amounts and stored USD snapshots;
 *   baselineAmount is never updated.
 *
 * The USD report values use the donation's historical amountUSD / amount rate,
 * not a freshly fetched exchange rate. Legacy non-USD donations without a
 * historical USD snapshot must be reconciled separately before live deployment.
 */
export async function reconcileStripeRefund(
  db: Db,
  stripe: RefundSource,
  refundId: string,
): Promise<"applied" | "reversed" | "pending" | "duplicate"> {
  if (!/^re_[A-Za-z0-9_]+$/.test(refundId)) return reject("INVALID_REFUND_ID");
  const refund = await stripe.refunds.retrieve(refundId);
  if (refund.id !== refundId) return reject("REFUND_ID_MISMATCH");
  const chargeId = idOf(refund.charge);
  if (!chargeId) return reject("REFUND_CHARGE_MISSING", true);
  const charge = await stripe.charges.retrieve(chargeId);
  if (charge.id !== chargeId || !charge.paid || !charge.captured) return reject("CHARGE_NOT_CAPTURED");
  if (charge.amount <= 0 || !Number.isSafeInteger(charge.amount)) return reject("CHARGE_AMOUNT_INVALID");
  const intentId = idOf(charge.payment_intent);
  const intent = intentId ? await stripe.paymentIntents.retrieve(intentId) : null;
  if (intentId && (!intent || intent.id !== intentId)) return reject("PAYMENT_INTENT_MISMATCH");
  if (idOf(refund.payment_intent) && idOf(refund.payment_intent) !== intentId) return reject("REFUND_INTENT_MISMATCH");
  let invoiceId = idOf((intent as any)?.invoice) ?? idOf((charge as any).invoice);
  const originalDonationId = (intent?.metadata?.donationId ?? charge.metadata?.donationId) || null;
  const query = [
    ...(invoiceId ? [{ providerOrderId: invoiceId }] : []),
    ...(intentId ? [{ providerOrderId: intentId }, { providerAuthCode: intentId }] : []),
    ...(originalDonationId && /^[0-9a-f]{24}$/.test(originalDonationId) ? [{ id: originalDonationId }] : []),
  ];
  if (!query.length) return reject("UNRESOLVED_PROVIDER_BINDING", true);
  let matches = await db.donation.findMany({
    where: { provider: "STRIPE", status: "PAID", paidAt: { not: null }, OR: query },
    include: { items: true, categoryItems: true },
    take: 3,
  });
  if (matches.length === 0 && !invoiceId && intentId) {
    // In modern Stripe Billing invoices the InvoicePayment record, not
    // Charge/PaymentIntent.invoice, may hold the authoritative relationship.
    // Never guess a billing period using a subscription-wide identifier.
    const paid = await stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: intentId },
      status: "paid", limit: 2,
    });
    if (paid.has_more || paid.data.length > 1) return reject("AMBIGUOUS_INVOICE_PAYMENTS");
    const identified = paid.data[0];
    invoiceId = identified ? idOf(identified.invoice) : null;
    if (invoiceId) {
      matches = await db.donation.findMany({
        where: { provider: "STRIPE", status: "PAID", paidAt: { not: null }, providerOrderId: invoiceId },
        include: { items: true, categoryItems: true }, take: 3,
      });
    }
  }
  if (matches.length !== 1) return reject("DONATION_NOT_UNIQUELY_SETTLED", matches.length === 0);
  const donation = matches[0];
  // A provider invoice is authoritative for a recurring donation. Never
  // confuse a later invoice for another charge of the same subscription.
  if (invoiceId && donation.subscriptionId && donation.providerOrderId !== invoiceId) return reject("INVOICE_DONATION_MISMATCH");
  if (originalDonationId && donation.id !== originalDonationId) return reject("INTENT_DONOR_MISMATCH");
  if (intentId && donation.providerOrderId !== invoiceId &&
      donation.providerOrderId !== intentId && donation.providerAuthCode !== intentId)
    return reject("INTENT_DONATION_MISMATCH");
  if (refund.currency.toLowerCase() !== charge.currency.toLowerCase() ||
      donation.currency.toLowerCase() !== charge.currency.toLowerCase()) return reject("REFUND_CURRENCY_MISMATCH");
  if (minorFromMajor(donation.totalAmount, charge.currency) !== charge.amount) return reject("ORIGINAL_CAPTURE_AMOUNT_MISMATCH");
  if (!Number.isSafeInteger(refund.amount) || refund.amount <= 0 || refund.amount > charge.amount)
    return reject("REFUND_AMOUNT_INVALID");
  // Historical conversion must be verified for ALL reported monetary components.
  const historicalBaseUSD = verifiedUsdCredit(donation.amount, donation.amountUSD, donation.currency);
  if (historicalBaseUSD == null || donation.amount <= 0) return reject("HISTORICAL_FX_UNAVAILABLE");
  const historicalRate = historicalBaseUSD / donation.amount;
  const lines = [
    ...donation.items.map(i => ({ kind: "campaign" as const, id: i.campaignId, amountUSD: verifiedUsdCredit(i.amount, i.amountUSD, donation.currency) })),
    ...donation.categoryItems.map(i => ({ kind: "category" as const, id: i.categoryId, amountUSD: verifiedUsdCredit(i.amount, i.amountUSD, donation.currency) })),
  ];
  if (lines.some(i => i.amountUSD == null)) return reject("HISTORICAL_LINE_FX_UNAVAILABLE");
  // Missing or incomplete original distribution must never silently refund the
  // donor while leaving project/category counters over-reported. In the
  // existing model campaign and category lines may each mirror the same cause
  // amount, hence exactly one or two cause totals are valid.
  const allocatedUSD = lines.reduce((sum, i) => sum + (i.amountUSD ?? 0), 0);
  if (!lines.length ||
      (Math.abs(allocatedUSD - historicalBaseUSD) > 0.025 &&
       Math.abs(allocatedUSD - historicalBaseUSD * 2) > 0.025))
    return reject("ORIGINAL_ALLOCATION_INCOMPLETE");
  const status = refund.status === "succeeded" ? "APPLIED" :
    refund.status === "failed" || refund.status === "canceled" ? "REVERSED" : "PENDING";
  const old = await db.stripeRefundSettlement.findUnique({ where: { id: refundId } });
  if (old && (old.donationId !== donation.id || old.chargeId !== chargeId ||
    old.paymentIntentId !== intentId || old.invoiceId !== invoiceId ||
    old.amountMinor !== refund.amount || old.chargeAmountMinor !== charge.amount ||
    old.currency.toLowerCase() !== refund.currency.toLowerCase()))
    return reject("REFUND_LEDGER_IDENTITY_CONFLICT");
  if (old?.status === status) return "duplicate";
  if (status === "PENDING" && old?.status === "APPLIED") return "duplicate";

  // No new exchange rates or hard-coded currency conversion. Cumulative
  // distribution avoids cents drifting across multiple partial refunds.
  const allocation = (amount: number, refundedMinor: number) =>
    Math.round(amount * 100 * refundedMinor / charge.amount) / 100;

  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const latest = await tx.stripeRefundSettlement.findUnique({ where: { id: refundId } });
        if (latest && (latest.donationId !== donation.id || latest.chargeId !== chargeId ||
            latest.amountMinor !== refund.amount || latest.currency !== refund.currency))
          return reject("REFUND_LEDGER_IDENTITY_CONFLICT");
        if (latest?.status === status || (status === "PENDING" && latest?.status === "APPLIED"))
          return "duplicate";
        const currentDonation = await tx.donation.findUnique({ where: { id: donation.id } });
        if (!currentDonation || !currentDonation.paidAt || currentDonation.status !== "PAID")
          return reject("DONATION_UNSETTLED", true);
        const before = currentDonation.refundedMinor ?? 0;
        const deltaMinor = (status === "APPLIED" ? refund.amount : 0) -
          (latest?.status === "APPLIED" ? refund.amount : 0);
        const after = before + deltaMinor;
        if (after < 0 || after > charge.amount) return reject("REFUND_EXCEEDS_ORIGINAL_CAPTURE");
        if (latest) {
          await tx.stripeRefundSettlement.update({
            where: { id: refundId },
            data: { status, ...(status === "APPLIED" ? { appliedAt: new Date() } : {}),
              ...(status === "REVERSED" ? { reversedAt: new Date() } : {}) },
          });
        } else {
          await tx.stripeRefundSettlement.create({ data: {
            id: refundId, donationId: donation.id, chargeId, paymentIntentId: intentId,
            invoiceId, amountMinor: refund.amount, chargeAmountMinor: charge.amount,
            currency: refund.currency.toLowerCase(), status,
            ...(status === "APPLIED" ? { appliedAt: new Date() } : {}),
            ...(status === "REVERSED" ? { reversedAt: new Date() } : {}),
          } });
        }
        if (deltaMinor === 0) return "pending";
        const original = {
          base: historicalBaseUSD,
          grossUSD: donation.totalAmount * historicalRate,
          localGross: donation.totalAmount,
          teamSupport: donation.teamSupport,
          fees: donation.coverFees ? donation.fees : 0,
        };
        await tx.donation.update({ where: { id: donation.id }, data: {
          refundedMinor: after,
          refundedAmountUSD: allocation(original.base, after),
          refundedTotalUSD: allocation(original.grossUSD, after),
          refundedTotalAmount: allocation(original.localGross, after),
          refundedTeamSupport: allocation(original.teamSupport, after),
          refundedFees: allocation(original.fees, after),
        } });
        for (const item of lines) {
          const full = item.amountUSD!;
          const delta = allocation(full, after) - allocation(full, before);
          if (delta === 0) continue;
          if (item.kind === "campaign") {
            await tx.campaign.update({ where: { id: item.id },
              data: { currentAmount: { increment: -delta } } });
          } else {
            await tx.category.update({ where: { id: item.id },
              data: { currentAmount: { increment: -delta } } });
          }
        }
        return deltaMinor > 0 ? "applied" : "reversed";
      });
    } catch (err) {
      const code = (err as {code?: string})?.code;
      if (code !== "P2002" && code !== "P2034") throw err;
      if (attempt === 6) throw err;
    }
  }
  return reject("REFUND_RETRY_EXHAUSTED", true);
}

export async function reconcileChargeRefunds(db: Db, stripe: RefundSource, chargeId: string) {
  if (!/^ch_[A-Za-z0-9_]+$/.test(chargeId)) return reject("INVALID_CHARGE_ID");
  const results: string[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 100; page++) {
    const list = await stripe.refunds.list({ charge: chargeId, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    if (!list.data.length && list.has_more) return reject("REFUND_PAGE_INCOMPLETE", true);
    for (const item of list.data) {
      if (idOf(item.charge) !== chargeId) return reject("REFUND_LIST_CHARGE_MISMATCH");
      results.push(await reconcileStripeRefund(db, stripe, item.id));
    }
    if (!list.has_more) return results;
    startingAfter = list.data.at(-1)?.id;
  }
  return reject("REFUND_PAGE_LIMIT_EXCEEDED", true);
}
