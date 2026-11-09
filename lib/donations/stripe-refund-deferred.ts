import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import {
  reconcileStripeRefund,
  StripeRefundReconciliationError,
} from "@/lib/donations/stripe-refund-settlement";

type StripeRefundReader = Pick<Stripe, "refunds" | "charges" | "paymentIntents" | "invoicePayments">;
const retryAt = (attempt: number) =>
  new Date(Date.now() + Math.min(24 * 60, 5 * 2 ** Math.min(attempt, 8)) * 60_000);

/**
 * Called ONLY after authenticating Stripe's signature. If the payment arrived
 * after its refund event, store the refund ID durably before acknowledging the
 * event. If the queue cannot be written, throw: Stripe must see HTTP 500.
 */
export async function reconcileOrDeferStripeRefund(
  db: PrismaClient,
  stripe: StripeRefundReader,
  refundId: string,
): Promise<"applied" | "reversed" | "pending" | "duplicate" | "deferred"> {
  try {
    const result = await reconcileStripeRefund(db, stripe, refundId);
    await db.stripeDeferredRefund.updateMany({
      where: { id: refundId, status: "PENDING" },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return result;
  } catch (error) {
    if (!(error instanceof StripeRefundReconciliationError) || !error.retryable) throw error;
    // Do not trust mutable client data; store only a verified provider refund ID
    // and an internal code. MongoDB's unique _id deduplicates deliveries.
    await db.stripeDeferredRefund.upsert({
      where: { id: refundId },
      create: { id: refundId, status: "PENDING", reason: error.code,
        nextAttemptAt: retryAt(0) },
      update: { status: "PENDING", reason: error.code, nextAttemptAt: retryAt(0),
        resolvedAt: null },
    });
    return "deferred";
  }
}

/**
 * Cron-reconciled until resolved. PENDING rows never expire; REQUIRES_REVIEW
 * rows stay durable with an error code, not silently discarded. Stripe's
 * present provider state is re-read on every attempt. All financial mutation
 * remains in reconcileStripeRefund's one atomic transaction.
 */
export async function reconcileDeferredStripeRefunds(
  db: PrismaClient,
  stripe: StripeRefundReader,
  opts: { dryRun?: boolean; now?: Date; limit?: number } = {},
): Promise<{ inspected: number; resolved: number; deferred: number; reviewRequired: number }> {
  const now = opts.now ?? new Date();
  const due = await db.stripeDeferredRefund.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(50, Math.max(1, opts.limit ?? 25)),
  });
  const result = { inspected: due.length, resolved: 0, deferred: 0, reviewRequired: 0 };
  if (opts.dryRun) return result;
  for (const row of due) {
    try {
      await reconcileStripeRefund(db, stripe, row.id);
      await db.stripeDeferredRefund.update({
        where: { id: row.id },
        data: { status: "RESOLVED", resolvedAt: new Date(), attempts: { increment: 1 },
          lastAttemptAt: new Date(), reason: "SETTLED" },
      });
      result.resolved++;
    } catch (error) {
      const retryable = error instanceof StripeRefundReconciliationError && error.retryable;
      const code = error instanceof StripeRefundReconciliationError
        ? error.code : "PROVIDER_OR_DATABASE_ERROR";
      const nextAttemptAt = retryAt((row.attempts ?? 0) + 1);
      // Provider/database transport failures may be transient. Do not convert
      // them into permanent review without verified contradictory evidence.
      const manualReview = error instanceof StripeRefundReconciliationError && !retryable;
      await db.stripeDeferredRefund.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 }, lastAttemptAt: new Date(),
          status: manualReview ? "REVIEW_REQUIRED" : "PENDING",
          reason: code, nextAttemptAt },
      });
      if (manualReview) result.reviewRequired++; else result.deferred++;
    }
  }
  return result;
}
