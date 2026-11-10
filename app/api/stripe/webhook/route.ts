import { recordSignedStripeCardDecline } from "@/lib/site-security/stripe-verified-decline";
import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getDonorCountryCodeForSnapshot } from "@/lib/donations/donor-country-code";
// Donate (success) is no longer fired from this webhook — it's owned by the
// /success page via POST /api/donations/:id/track-conversion so the browser
// Pixel and CAPI fire as a single dedup'd pair. DonateFailed remains here
// because failed donors typically never reach a /success-style page.
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";
import { dispatchDonationPaid, dispatchEvent } from "@/lib/events/dispatch";
import { donationFieldEmpty } from "@/lib/donations/mongo-null";
import { normalizeDonationCurrencyCode } from "@/lib/exchange/convert-amount-in-currency-to-usd";
import { checkoutPaymentCanSettle, stripeInvoiceSettlementDate, stripeSubscriptionOwnershipMatches } from "@/lib/donations/stripe-checkout-settlement";
import { stripeOneTimePaymentMatchesDonation } from "@/lib/donations/stripe-one-time-payment";
import { settleStripeInvoiceOnce } from "@/lib/donations/stripe-invoice-settlement";
import { verifiedUsdCredit } from "@/lib/donations/verified-usd-credit";
import { stripeBillingState } from "@/lib/donations/stripe-subscription-billing";
import { reconcileChargeRefunds } from "@/lib/donations/stripe-refund-settlement";
import { reconcileOrDeferStripeRefund } from "@/lib/donations/stripe-refund-deferred";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Preserve the provider API version already used by this handler. Stripe SDK
  // only types its latest version; do not silently change runtime API semantics.
  // SDK v22's type only admits its latest version; preserve the existing
  // explicit runtime version rather than silently changing Stripe behavior.
  apiVersion: "2026-03-25.dahlia" as any,
});

// Stripe removed `invoice.subscription` in API 2024-09-30. The subscription ID
// now lives under `invoice.parent.subscription_details.subscription`. Read the
// new path first and fall back to the legacy field so older events still work.
function getStripeSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const fromParent = (invoice as any).parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return (fromParent as { id: string }).id;
  }
  const legacy = (invoice as any).subscription;
  return typeof legacy === "string" ? legacy : null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("Stripe webhook: missing signature or secret");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.arrayBuffer();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donationId = session.metadata?.donationId;
        const subscriptionDbId = session.metadata?.subscriptionDbId;

        if (!donationId) break;

        const isMonthly = session.mode === "subscription";

        // Subscriptions have a separate authoritative invoice.payment_succeeded
        // event. Settling them here would count the signup invoice twice when
        // the two webhook event types arrive in either order.
        if (isMonthly) {
          if (subscriptionDbId && session.subscription) {
            await prisma.subscription.update({
              where: { id: subscriptionDbId },
              data: { payforToken: session.subscription as string },
            });
          }
          break;
        }

        if (checkoutPaymentCanSettle(session.mode, session.payment_status)) {
          const settledNow = await prisma.$transaction(async (tx) => {
            const donation = await tx.donation.findUnique({
              where: { id: donationId },
              include: { items: true, categoryItems: true },
            });
            // Idempotency: the row is created with status=PAID by /api/stripe/intent
            // before Stripe confirms payment, so we key off paidAt (only set here).
            if (!donation || donation.paidAt != null) return false;
            if (!stripeOneTimePaymentMatchesDonation(donation, {
              id: session.id,
              amountMinor: session.amount_total,
              currency: session.currency,
            })) {
              throw new Error("Stripe Checkout settlement does not match original donation");
            }

            // Mark donation as paid
            await tx.donation.update({
              where: { id: donationId },
              data: {
                status: "PAID",
                paidAt: new Date(event.created * 1000),
                provider: "STRIPE",
                providerOrderId: session.id,
                providerAuthCode: session.payment_intent as string ?? null,
                providerTxnResult: "Success",
                providerRaw: session as any,
              },
            });

            // Apply campaign/category amount increments
            for (const item of donation.items) {
              const credit = verifiedUsdCredit(item.amount, item.amountUSD, donation.currency);
              if (credit === null) {
                console.warn("[stripe] skipping non-USD project/category increment without recorded FX", { invoiceOrSession: session.id });
                continue;
              }
              await tx.campaign.update({
                where: { id: item.campaignId },
                data: { currentAmount: { increment: credit } },
              });
            }
            for (const item of donation.categoryItems) {
              const credit = verifiedUsdCredit(item.amount, item.amountUSD, donation.currency);
              if (credit === null) {
                console.warn("[stripe] skipping non-USD project/category increment without recorded FX", { invoiceOrSession: session.id });
                continue;
              }
              await tx.category.update({
                where: { id: item.categoryId },
                data: { currentAmount: { increment: credit } },
              });
            }

            return true;
          });
          if (settledNow) after(() => dispatchDonationPaid(donationId));
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = getStripeSubscriptionIdFromInvoice(invoice);
        if (!stripeSubscriptionId) break;

        // Find our DB subscription by Stripe subscription ID (stored in payforToken)
        let dbSubscription = await prisma.subscription.findFirst({
          where: { payforToken: stripeSubscriptionId },
          include: { items: true, categoryItems: true },
        });
        // Stripe can deliver invoice.payment_succeeded BEFORE the Checkout
        // session completion event has populated payforToken. Look up only
        // the Stripe subscription's own signed, server-created metadata.
        // Never settle an arbitrary database subscription from invoice data.
        if (!dbSubscription) {
          const remoteSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const dbId = remoteSub.metadata?.subscriptionDbId;
          const ownerId = remoteSub.metadata?.userId;
          if (dbId && ownerId) {
            const candidate = await prisma.subscription.findUnique({
              where: { id: dbId },
              include: { items: true, categoryItems: true },
            });
            if (candidate && stripeSubscriptionOwnershipMatches(
              candidate,
              stripeSubscriptionId,
              { subscriptionDbId: dbId, userId: ownerId },
              dbId,
            )) {
              if (!candidate.payforToken) {
                await prisma.subscription.update({
                  where: { id: candidate.id },
                  data: { payforToken: stripeSubscriptionId },
                });
              }
              dbSubscription = candidate;
            }
          }
        }
        if (!dbSubscription) break;

        // Idempotency: skip if we've already settled this invoice. The original
        // "checkout started" donation for the first invoice also carries this
        // `providerOrderId` (set by /api/stripe/subscribe) but with `paidAt: null`,
        // so we MUST require `paidAt` to be set here — otherwise the webhook would
        // bail out without ever marking the donation paid. That was the source of
        // the long-standing "monthly donations stuck PAID/paidAt=null" bug.
        const existingForInvoice = await prisma.donation.findFirst({
          where: {
            subscriptionId: dbSubscription.id,
            providerOrderId: invoice.id,
            paidAt: { not: null },
          },
        });
        if (existingForInvoice) break;

        // The invoice can be created days before it is actually paid.
        // Stripe status_transitions.paid_at is the collected-money calendar.
        // Fallback to the signed webhook event time, never invoice.created.
        const paidAt = stripeInvoiceSettlementDate(invoice.status_transitions?.paid_at, event.created);

        // Stripe's own first-vs-renewal marker. "subscription_create" is the signup
        // charge; "subscription_cycle" is an automatic renewal. Anything else
        // (subscription_update / manual) is treated as a renewal-style charge —
        // it is money taken without a fresh checkout, so it needs its own row.
        const billingReason = ((invoice as any).billing_reason as string | null) ?? null;
        const isSignupInvoice = billingReason === "subscription_create";

        // Stripe owns the period anchor. A late-paid invoice must not shift
        // the next due date; a canceled or failed plan must not be revived.
        const billingSnapshot = stripeBillingState(
          await stripe.subscriptions.retrieve(stripeSubscriptionId),
        );

        const fees = (dbSubscription.amount + dbSubscription.teamSupport) * 0.03;
        const finalTotal =
          dbSubscription.amount +
          dbSubscription.teamSupport +
          (dbSubscription.coverFees ? fees : 0);

        const donorCountrySnapshot =
          (await getDonorCountryCodeForSnapshot(prisma, dbSubscription.donorId)) ??
          undefined;

        const settlementOutcome = await settleStripeInvoiceOnce(
          prisma,
          { invoiceId: invoice.id, subscriptionId: dbSubscription.id, paidAt },
          async (tx) => {
          // Find the original "checkout started" donation for this subscription
          // (status=PAID is the optimistic sentinel; paidAt=null means it never
          // settled). For the FIRST invoice we update that row instead of
          // creating a duplicate. Match by providerOrderId when it lines up,
          // but fall back to the unpaid row for this subscription — different
          // checkout flows (PaymentElement vs Checkout Session) store different
          // ids in providerOrderId, so equality-by-invoice-id isn't reliable.
          //
          // The fallback is deliberately gated on this being the SIGNUP invoice.
          // It matches any dangling unsettled row for the subscription, so on a
          // renewal (`subscription_cycle`) it would silently swallow the new
          // charge into a months-old row instead of creating one — the renewal
          // would then be invisible in every createdAt-ranged dashboard and the
          // subscription would stay permanently one donation short.
          // `paidAt` is ABSENT (not null) on rows created by the checkout routes, and Prisma's
          // `{ paidAt: null }` does not match an absent field on MongoDB. That mismatch is what
          // made this handler miss the row it had already created and insert a duplicate
          // donation for an invoice it had just recorded — see lib/donations/mongo-null.ts.
          const existingPending =
            (await tx.donation.findFirst({
              where: {
                AND: [
                  { subscriptionId: dbSubscription.id, providerOrderId: invoice.id },
                  donationFieldEmpty("paidAt"),
                ],
              },
              include: { items: true, categoryItems: true },
            })) ??
            (isSignupInvoice
              ? await tx.donation.findFirst({
                  where: {
                    AND: [
                      { subscriptionId: dbSubscription.id, status: "PAID" },
                      donationFieldEmpty("paidAt"),
                    ],
                  },
                  orderBy: { createdAt: "asc" },
                  include: { items: true, categoryItems: true },
                })
              : null);

          if (existingPending) {
            // First invoice: update the existing donation with provider details
            await tx.donation.update({
              where: { id: existingPending.id },
              data: {
                status: "PAID",
                paidAt,
                billingReason,
                providerOrderId: invoice.id,
                providerAuthCode: stripeSubscriptionId,
                providerTxnResult: "Success",
                providerRaw: invoice as any,
                // Signup checkout rows can be created without allocation
                // snapshots. Persist the EXACT settlement allocation before
                // refunds rely on it; never infer history from a later plan.
                ...(existingPending.items.length === 0 && dbSubscription.items.length
                  ? { items: { create: dbSubscription.items.map(i => ({
                        campaignId: i.campaignId, amount: i.amount, amountUSD: i.amountUSD,
                      })) } } : {}),
                ...(existingPending.categoryItems.length === 0 && dbSubscription.categoryItems.length
                  ? { categoryItems: { create: dbSubscription.categoryItems.map(i => ({
                        categoryId: i.categoryId, amount: i.amount, amountUSD: i.amountUSD,
                      })) } } : {}),
              },
            });
          } else {
            // Recurring invoice: create a new PAID donation record
            await tx.donation.create({
              data: {
                amount: dbSubscription.amount,
                // NEVER fall back to the raw local amount: that writes e.g. a ₺-denominated
                // number into the USD column, inflating revenue ~34x. If the subscription is
                // itself USD, `amount` IS the USD value; otherwise record null and let the
                // dashboard's USD helpers / a backfill handle it. A null we can detect beats a
                // wrong number we cannot.
                amountUSD:
                  dbSubscription.amountUSD ??
                  (normalizeDonationCurrencyCode(dbSubscription.currency) === "USD"
                    ? dbSubscription.amount
                    : null),
                teamSupport: dbSubscription.teamSupport,
                coverFees: dbSubscription.coverFees,
                currency: dbSubscription.currency,
                fees: dbSubscription.coverFees ? fees : 0,
                totalAmount: finalTotal,
                status: "PAID",
                paidAt,
                // Stamp createdAt from the invoice too. Every dashboard/list range
                // filter keys on createdAt, so leaving it at now() would file the
                // charge under the wrong period on any delayed/replayed delivery.
                createdAt: paidAt,
                billingReason,
                donorCountryCode: donorCountrySnapshot,
                donorId: dbSubscription.donorId,
                subscriptionId: dbSubscription.id,
                // Carried from the subscription so renewals keep showing up on
                // referral dashboards and in locale-segmented reporting.
                referralId: dbSubscription.referralId ?? undefined,
                paymentMethod: "CARD",
                provider: "STRIPE",
                providerOrderId: invoice.id,
                providerAuthCode: stripeSubscriptionId,
                providerTxnResult: "Success",
                providerRaw: invoice as any,
                items: dbSubscription.items.length > 0
                  ? {
                      create: dbSubscription.items.map((item) => ({
                        campaignId: item.campaignId,
                        amount: item.amount,
                        amountUSD: item.amountUSD,
                      })),
                    }
                  : undefined,
                categoryItems: dbSubscription.categoryItems.length > 0
                  ? {
                      create: dbSubscription.categoryItems.map((item) => ({
                        categoryId: item.categoryId,
                        amount: item.amount,
                        amountUSD: item.amountUSD,
                      })),
                    }
                  : undefined,
              },
            });
          }

          // Apply campaign/category amount increments for every paid invoice
          for (const item of dbSubscription.items) {
            const credit = verifiedUsdCredit(item.amount, item.amountUSD, dbSubscription.currency);
            if (credit === null) {
              console.warn("[stripe] skipping non-USD project/category increment without recorded FX", { invoiceOrSession: invoice.id });
              continue;
            }
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { currentAmount: { increment: credit } },
            });
          }
          for (const item of dbSubscription.categoryItems) {
            const credit = verifiedUsdCredit(item.amount, item.amountUSD, dbSubscription.currency);
            if (credit === null) {
              console.warn("[stripe] skipping non-USD project/category increment without recorded FX", { invoiceOrSession: invoice.id });
              continue;
            }
            await tx.category.update({
              where: { id: item.categoryId },
              data: { currentAmount: { increment: credit } },
            });
          }

          // Update subscription billing dates (Stripe drives the actual cadence)
          await tx.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              lastBillingDate: paidAt,
              ...(billingSnapshot.nextBillingDate ? { nextBillingDate: billingSnapshot.nextBillingDate } : {}),
              ...(billingSnapshot.status ? { status: billingSnapshot.status } : {}),
            },
          });
          },
        );
        if (settlementOutcome === "duplicate") break;
        const paidForInvoice = await prisma.donation.findFirst({
          where: {
            subscriptionId: dbSubscription.id,
            providerOrderId: invoice.id,
            status: "PAID",
          },
          select: { id: true },
        });
        if (paidForInvoice) {
          after(() => dispatchEvent("SUBSCRIPTION_PAYMENT", { donationId: paidForInvoice.id }));
          if (isSignupInvoice) {
            after(() => dispatchEvent("SUBSCRIPTION_CREATED", { donationId: paidForInvoice.id }));
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // Monthly billing failed — log a FAILED donation for audit trail.
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = getStripeSubscriptionIdFromInvoice(invoice);
        if (!stripeSubscriptionId) break;

        let dbSubscription = await prisma.subscription.findFirst({
          where: { payforToken: stripeSubscriptionId },
        });
        // Stripe may send the FAILED first invoice before Checkout binds the
        // provider subscription. Resolve only from trusted provider metadata.
        if (!dbSubscription) {
          const remoteSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const dbId = remoteSub.metadata?.subscriptionDbId;
          const ownerId = remoteSub.metadata?.userId;
          if (dbId && ownerId) {
            const candidate = await prisma.subscription.findUnique({ where: { id: dbId } });
            if (candidate && stripeSubscriptionOwnershipMatches(
              candidate,
              stripeSubscriptionId,
              { subscriptionDbId: dbId, userId: ownerId },
              dbId,
            )) {
              if (!candidate.payforToken) {
                await prisma.subscription.update({
                  where: { id: candidate.id },
                  data: { payforToken: stripeSubscriptionId },
                });
              }
              dbSubscription = candidate;
            }
          }
        }
        if (!dbSubscription) break;

        // Idempotency: skip if already recorded
        const existingFailed = await prisma.donation.findFirst({
          where: { subscriptionId: dbSubscription.id, providerOrderId: invoice.id },
        });
        // The signup creates an unsettled donation before Stripe attempts the
        // first charge. Never create a second FAILED row for that invoice or
        // leave an unpaid subscription labeled ACTIVE.
        if (existingFailed) {
          if (existingFailed.paidAt != null) break; // A successful charge always wins.
          const changed = await prisma.donation.updateMany({
            where: {
              AND: [{ id: existingFailed.id }, donationFieldEmpty("paidAt")],
            },
            data: {
              status: "FAILED",
              providerTxnResult: "Failed",
              providerErrorMessage: "Monthly billing failed via Stripe",
            },
          });
          if (changed.count > 0) {
            await prisma.subscription.update({
              where: { id: dbSubscription.id },
              data: { status: "PAYMENT_FAILED" },
            });
            if (existingFailed.status !== "FAILED") {
              after(() => dispatchEvent("DONATION_FAILED", { donationId: existingFailed.id }));
              void sendDonationFailedConversions(existingFailed.id);
            }
          }
          break;
        }

        const fees = (dbSubscription.amount + dbSubscription.teamSupport) * 0.03;
        const finalTotal =
          dbSubscription.amount +
          dbSubscription.teamSupport +
          (dbSubscription.coverFees ? fees : 0);

        const donorCountrySnapshot =
          (await getDonorCountryCodeForSnapshot(prisma, dbSubscription.donorId)) ??
          undefined;

        const failedRecurring = await prisma.donation.create({
          data: {
            amount: dbSubscription.amount,
            // NEVER fall back to the raw local amount: that writes e.g. a ₺-denominated
                // number into the USD column, inflating revenue ~34x. If the subscription is
                // itself USD, `amount` IS the USD value; otherwise record null and let the
                // dashboard's USD helpers / a backfill handle it. A null we can detect beats a
                // wrong number we cannot.
                amountUSD:
                  dbSubscription.amountUSD ??
                  (normalizeDonationCurrencyCode(dbSubscription.currency) === "USD"
                    ? dbSubscription.amount
                    : null),
            teamSupport: dbSubscription.teamSupport,
            coverFees: dbSubscription.coverFees,
            currency: dbSubscription.currency,
            fees: dbSubscription.coverFees ? fees : 0,
            totalAmount: finalTotal,
            status: "FAILED",
            donorCountryCode: donorCountrySnapshot,
            donorId: dbSubscription.donorId,
            subscriptionId: dbSubscription.id,
            paymentMethod: "CARD",
            provider: "STRIPE",
            providerOrderId: invoice.id,
            providerErrorMessage: "Monthly billing failed via Stripe",
            providerRaw: invoice as any,
          },
        });
        // Seed Meta DonateFailed for the failed recurring charge so lookalike
        // audiences still get the "donor who tried" signal on monthly drops.
        void sendDonationFailedConversions(failedRecurring.id);
        await prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: { status: "PAYMENT_FAILED" },
        });
        break;
      }

      case "payment_intent.succeeded": {
        // Direct PaymentIntent (via Elements, not Checkout).
        // Skip if this PaymentIntent came from a Stripe Invoice (subscription payment).
        // Those are fully handled by invoice.payment_succeeded to avoid duplicate donations.
        const intent = event.data.object as Stripe.PaymentIntent;
        if ((intent as any).invoice) break;

        const donationId = intent.metadata?.donationId;
        if (!donationId) break;

        const settledNow = await prisma.$transaction(async (tx) => {
          const donation = await tx.donation.findUnique({
            where: { id: donationId },
            include: { items: true, categoryItems: true },
          });
          // Idempotency: the row is created with status=PAID by /api/stripe/intent
          // before Stripe confirms payment, so we key off paidAt (only set here).
          if (!donation || donation.paidAt != null) return false;
          // Stripe Checkout also emits payment_intent.succeeded. That payment
          // belongs to its Checkout Session (cs_), not this direct-Intent path.
          // A signed unrelated payment must never settle another donation.
          if (donation.providerOrderId?.startsWith("cs_")) return false;
          if (intent.status !== "succeeded" || !stripeOneTimePaymentMatchesDonation(donation, {
            id: intent.id,
            amountMinor: intent.amount_received,
            currency: intent.currency,
          })) {
            throw new Error("Stripe PaymentIntent settlement does not match original donation");
          }

          await tx.donation.update({
            where: { id: donationId },
            data: {
              status: "PAID",
              paidAt: new Date(event.created * 1000),
              provider: "STRIPE",
              providerOrderId: intent.id,
              providerAuthCode: intent.id,
              providerTxnResult: "Success",
              providerRaw: intent as never,
            },
          });

          for (const item of donation.items) {
            const credit = verifiedUsdCredit(item.amount, item.amountUSD, donation.currency);
            if (credit === null) {
              console.warn("[stripe] skipping non-USD campaign increment without recorded FX", { intentId: intent.id });
              continue;
            }
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { currentAmount: { increment: credit } },
            });
          }
          for (const item of donation.categoryItems) {
            const credit = verifiedUsdCredit(item.amount, item.amountUSD, donation.currency);
            if (credit === null) {
              console.warn("[stripe] skipping non-USD category increment without recorded FX", { intentId: intent.id });
              continue;
            }
            await tx.category.update({
              where: { id: item.categoryId },
              data: { currentAmount: { increment: credit } },
            });
          }
          return true;
        });
        if (settledNow) after(() => dispatchDonationPaid(donationId));
        break;
      }

      case "payment_intent.payment_failed": {
        // Direct PaymentIntent (Stripe Elements) declined or otherwise failed.
        // Mark the corresponding donation as FAILED so the row reflects reality
        // (donations are created with status=PAID preemptively in /api/stripe/intent).
        // We deliberately key off paidAt — a parallel "succeeded" event must always win.
        const intent = event.data.object as Stripe.PaymentIntent;
        if ((intent as any).invoice) break; // subscription invoice — handled elsewhere

        const donationId = intent.metadata?.donationId;
        if (!donationId) break;

        const donation = await prisma.donation.findUnique({
          where: { id: donationId },
          select: { paidAt: true, status: true, attribution: true },
        });
        if (!donation || donation.paidAt || donation.status === "FAILED") break;

        const lastError =
          (intent.last_payment_error?.message as string | undefined) ??
          "payment_intent.payment_failed";

        await prisma.donation.update({
          where: { id: donationId },
          data: {
            status: "FAILED",
            provider: "STRIPE",
            providerOrderId: intent.id,
            providerTxnResult: "Failed",
            providerErrorMessage: lastError,
            providerRaw: intent as never,
          },
        });
        // Only a signed, provider-confirmed card error is eligible for fraud counting.
        // Schedule this after financial failure state is persisted; never count timeouts.
        after(() => recordSignedStripeCardDecline(intent, event.id, donation));
        after(() => dispatchEvent("DONATION_FAILED", { donationId }));
        // Browser may have closed before /api/donations/:id/fail PATCH fired —
        // seed DonateFailed from here so the lookalike audience never misses a
        // failed Stripe Elements attempt.
        void sendDonationFailedConversions(donationId);
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        // Hosted Stripe Checkout failed or expired without a successful payment.
        const session = event.data.object as Stripe.Checkout.Session;
        const donationId = session.metadata?.donationId;
        if (!donationId) break;

        const donation = await prisma.donation.findUnique({
          where: { id: donationId },
          select: { paidAt: true, status: true },
        });
        if (!donation || donation.paidAt || donation.status === "FAILED") break;

        await prisma.donation.update({
          where: { id: donationId },
          data: {
            status: "FAILED",
            provider: "STRIPE",
            providerOrderId: session.id,
            providerTxnResult: "Failed",
            providerErrorMessage: event.type,
            providerRaw: session as never,
          },
        });
        after(() => dispatchEvent("DONATION_FAILED", { donationId }));
        // Hosted Stripe Checkout expired/failed before payment — seed Meta
        // DonateFailed so the abandoned-checkout cohort feeds lookalikes.
        void sendDonationFailedConversions(donationId);
        break;
      }

      case "charge.refunded": {
        // Charge events are notifications, not settlement evidence. The refund
        // list is read back from Stripe, and each refund is re-retrieved and
        // recorded exactly once inside MongoDB.
        const charge = event.data.object as Stripe.Charge;
        await reconcileChargeRefunds(prisma, stripe, charge.id,
          refundId => reconcileOrDeferStripeRefund(prisma, stripe, refundId));
        break;
      }

      case "refund.created":
      case "refund.updated":
      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;
        await reconcileOrDeferStripeRefund(prisma, stripe, refund.id);
        break;
      }

      case "customer.subscription.updated": {
        // An event may be delivered after a newer status update. Re-read the
        // provider's current state rather than trusting an out-of-order payload.
        const updated = event.data.object as Stripe.Subscription;
        const local = await prisma.subscription.findFirst({
          where: { payforToken: updated.id },
          select: { id: true },
        });
        if (!local) break;
        const provider = await stripe.subscriptions.retrieve(updated.id);
        const state = stripeBillingState(provider);
        if (!state.status) break;
        // "ACTIVE" in Stripe does not prove that the first donation settled.
        const confirmed = state.status === "ACTIVE"
          ? await prisma.donation.findFirst({
              where: { subscriptionId: local.id, paidAt: { not: null } },
              select: { id: true },
            })
          : null;
        await prisma.subscription.update({
          where: { id: local.id },
          data: {
            status: state.status === "ACTIVE" && !confirmed
              ? "PAYMENT_FAILED"
              : state.status,
            ...(state.nextBillingDate ? { nextBillingDate: state.nextBillingDate } : {}),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        // Stripe subscription cancelled
        const stripeSub = event.data.object as Stripe.Subscription;
        const dbSubscription = await prisma.subscription.findFirst({
          where: { payforToken: stripeSub.id },
        });
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: { status: "CANCELLED" },
          });
          after(() => dispatchEvent("SUBSCRIPTION_CANCELLED", { userId: dbSubscription.donorId }));
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
