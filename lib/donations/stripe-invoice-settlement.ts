import { Prisma, PrismaClient } from "@prisma/client";

/**
 * MongoDB _id is the linearization point for one paid Stripe invoice.
 * Receipt creation, donation mutation and campaign/category increments execute
 * in the SAME MongoDB transaction. A replay may not apply money twice.
 *
 * The StripeInvoiceSettlement collection must be provisioned before a live
 * webhook is enabled; creating collections inside Mongo transactions can fail.
 */
export async function settleStripeInvoiceOnce(
  db: PrismaClient,
  input: { invoiceId: string; subscriptionId: string; paidAt: Date },
  settle: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<"settled" | "duplicate"> {
  if (!/^in_[A-Za-z0-9_]+$/.test(input.invoiceId)) {
    throw new Error("Invalid Stripe invoice reference");
  }
  const existing = await db.stripeInvoiceSettlement.findUnique({
    where: { id: input.invoiceId },
    select: { subscriptionId: true },
  });
  if (existing) {
    if (existing.subscriptionId !== input.subscriptionId) {
      throw new Error("Stripe invoice has a conflicting subscription owner");
    }
    return "duplicate";
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db.$transaction(async (tx) => {
        // Unique MongoDB _id prevents a concurrent successful claimant.
        await tx.stripeInvoiceSettlement.create({
          data: {
            id: input.invoiceId,
            subscriptionId: input.subscriptionId,
            paidAt: input.paidAt,
          },
        });
        await settle(tx);
      });
      return "settled";
    } catch (error) {
      const code = (error as { code?: string })?.code;
      // Parallel Mongo transactions can collide, e.g. P2034 WriteConflict.
      // Retry the *entire* transaction and never run the side effects alone.
      if (code !== "P2002" && code !== "P2034") throw error;
      const committed = await db.stripeInvoiceSettlement.findUnique({
        where: { id: input.invoiceId },
        select: { subscriptionId: true },
      });
      if (committed) {
        if (committed.subscriptionId !== input.subscriptionId) {
          throw new Error("Stripe invoice has a conflicting subscription owner");
        }
        return "duplicate";
      }
      if (attempt === 4) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, (attempt + 1) * 20));
    }
  }
  throw new Error("Stripe invoice settlement retry exhausted");
}
