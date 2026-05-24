/**
 * Backfill `paidAt` on monthly-subscription donations that got stuck in the
 * "PAID + paidAt=null" limbo state.
 *
 * Background: across both Stripe and PayFor flows the "checkout started" donation
 * is written with `status: "PAID"` + `paidAt: null` as an optimistic placeholder.
 * The provider webhook is then supposed to flip `paidAt` once the charge settles.
 * The Stripe webhook had a bug (since fixed) where the idempotency check matched
 * that placeholder row and bailed out without ever writing `paidAt`, so monthly
 * donations counted as "paid" in dashboards while never being timestamped.
 *
 * What this script does (idempotent):
 *   1. For STRIPE rows: re-query the invoice via the Stripe API. If Stripe says
 *      it's paid, set `paidAt` from the invoice timestamp and run the
 *      campaign/category amount increments the webhook should have done.
 *      If Stripe says the invoice is void/uncollectible, flip to FAILED. Anything
 *      else (open/draft) is left alone — those genuinely haven't paid yet.
 *   2. For PAYFOR / other-provider rows: we have no recurring-charge API to
 *      verify against, so we only touch donations whose parent Subscription has
 *      already been billed at least once (`lastBillingDate != null`). For those
 *      we set `paidAt = donation.createdAt` as a best-effort reconciliation —
 *      we know the subscription billing actually fired, the donation row was
 *      created in the billing flow, so the missing timestamp is the bug.
 *
 * Run with:  npx tsx scripts/backfill-subscription-donations-paidat.ts
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();

const stripeKey = process.env.STRIPE_SECRET_KEY;
// Pin the same API version the runtime webhook uses. Cast through `any` because
// the Stripe SDK's LatestApiVersion type alias isn't exported in all versions.
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" as any })
  : null;

function getStripeSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromParent = (invoice as any).parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return (fromParent as { id: string }).id;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacy = (invoice as any).subscription;
  return typeof legacy === "string" ? legacy : null;
}

async function backfillStripe() {
  if (!stripe) {
    console.log("⏭  Skipping STRIPE backfill — STRIPE_SECRET_KEY is not set");
    return { settled: 0, failed: 0, skipped: 0, errors: 0 };
  }

  const candidates = await prisma.donation.findMany({
    where: {
      status: "PAID",
      paidAt: null,
      subscriptionId: { not: null },
      provider: "STRIPE",
      providerOrderId: { not: null },
    },
    include: {
      items: true,
      categoryItems: true,
    },
  });

  let settled = 0;
  let failed = 0;
  let skipped = 0;
  let errors = 0;

  for (const donation of candidates) {
    const orderId = donation.providerOrderId;
    if (!orderId) {
      skipped += 1;
      continue;
    }

    // providerOrderId might be either a Stripe invoice id (in_…) or a session id (cs_…).
    // We only act on real invoices here; sessions go through a separate webhook path.
    if (!orderId.startsWith("in_")) {
      skipped += 1;
      continue;
    }

    try {
      const invoice = await stripe.invoices.retrieve(orderId);

      if (invoice.status === "paid") {
        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(invoice.created * 1000);

        await prisma.$transaction(async (tx) => {
          await tx.donation.update({
            where: { id: donation.id },
            data: {
              paidAt,
              providerAuthCode:
                donation.providerAuthCode ?? getStripeSubscriptionIdFromInvoice(invoice),
              providerTxnResult: donation.providerTxnResult ?? "Success",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              providerRaw: (donation.providerRaw ?? (invoice as any)) as any,
            },
          });

          // Apply the per-item totals the webhook should have applied.
          for (const item of donation.items) {
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }
          for (const item of donation.categoryItems) {
            await tx.category.update({
              where: { id: item.categoryId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }

          if (donation.subscriptionId) {
            const sub = await tx.subscription.findUnique({
              where: { id: donation.subscriptionId },
              select: { lastBillingDate: true },
            });
            if (!sub?.lastBillingDate || sub.lastBillingDate < paidAt) {
              await tx.subscription.update({
                where: { id: donation.subscriptionId },
                data: { lastBillingDate: paidAt, status: "ACTIVE" },
              });
            }
          }
        });
        settled += 1;
      } else if (invoice.status === "void" || invoice.status === "uncollectible") {
        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            providerErrorMessage: `Invoice ${invoice.status} per Stripe`,
            providerTxnResult: "Failed",
          },
        });
        failed += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      console.error(`   ✗ Stripe lookup failed for donation ${donation.id}:`, err);
      errors += 1;
    }
  }

  return { settled, failed, skipped, errors };
}

async function backfillNonStripe() {
  // For non-Stripe rows we can't ask the provider again, so we use the parent
  // Subscription's billing dates as evidence the charge actually fired.
  const candidates = await prisma.donation.findMany({
    where: {
      status: "PAID",
      paidAt: null,
      subscriptionId: { not: null },
      NOT: { provider: "STRIPE" },
    },
    select: {
      id: true,
      createdAt: true,
      subscriptionId: true,
    },
  });

  let settled = 0;
  let skipped = 0;

  for (const donation of candidates) {
    if (!donation.subscriptionId) {
      skipped += 1;
      continue;
    }
    const sub = await prisma.subscription.findUnique({
      where: { id: donation.subscriptionId },
      select: { lastBillingDate: true, createdAt: true },
    });
    // Only backfill when the subscription has at least one billing recorded.
    // Otherwise the donation is a true unsettled checkout, not a stuck row.
    if (!sub?.lastBillingDate) {
      skipped += 1;
      continue;
    }
    await prisma.donation.update({
      where: { id: donation.id },
      data: { paidAt: donation.createdAt },
    });
    settled += 1;
  }

  return { settled, skipped };
}

async function main() {
  console.log("🔁 Backfilling missing paidAt on monthly-subscription donations…");

  const totalStuck = await prisma.donation.count({
    where: {
      status: "PAID",
      paidAt: null,
      subscriptionId: { not: null },
    },
  });
  console.log(`   Found ${totalStuck} stuck row(s) (status=PAID + paidAt=null + subscriptionId set)`);

  const stripeResult = await backfillStripe();
  console.log(
    `   STRIPE — settled: ${stripeResult.settled}, marked FAILED: ${stripeResult.failed}, skipped: ${stripeResult.skipped}, errors: ${stripeResult.errors}`
  );

  const otherResult = await backfillNonStripe();
  console.log(
    `   OTHER — settled (paidAt = createdAt where sub.lastBillingDate is set): ${otherResult.settled}, skipped: ${otherResult.skipped}`
  );

  const remaining = await prisma.donation.count({
    where: {
      status: "PAID",
      paidAt: null,
      subscriptionId: { not: null },
    },
  });
  console.log(`   ${remaining} stuck row(s) remain after backfill`);
  console.log("✅ Backfill complete");
}

main()
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
