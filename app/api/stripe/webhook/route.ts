import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getDonorCountryCodeForSnapshot } from "@/lib/donations/donor-country-code";
import {
  sendDonationServerConversions,
  sendDonationFailedConversions,
} from "@/lib/tracking/donation-conversion-server";
import { dispatchDonationPaid, dispatchEvent } from "@/lib/events/dispatch";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

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

        if (session.payment_status === "paid" || isMonthly) {
          await prisma.$transaction(async (tx) => {
            const donation = await tx.donation.findUnique({
              where: { id: donationId },
              include: { items: true, categoryItems: true },
            });
            // Idempotency: the row is created with status=PAID by /api/stripe/intent
            // before Stripe confirms payment, so we key off paidAt (only set here).
            if (!donation || donation.paidAt != null) return;

            // Mark donation as paid
            await tx.donation.update({
              where: { id: donationId },
              data: {
                status: "PAID",
                paidAt: new Date(),
                provider: "STRIPE",
                providerOrderId: session.id,
                providerAuthCode: session.payment_intent as string ?? null,
                providerTxnResult: "Success",
                providerRaw: session as any,
              },
            });

            // Apply campaign/category amount increments
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

            // If monthly subscription, store Stripe subscription ID
            if (isMonthly && subscriptionDbId && session.subscription) {
              await tx.subscription.update({
                where: { id: subscriptionDbId },
                data: {
                  // Reuse payforToken field to store Stripe subscription ID
                  payforToken: session.subscription as string,
                },
              });
            }
          });
          void sendDonationServerConversions(donationId);
          void dispatchDonationPaid(donationId);
          if (isMonthly && subscriptionDbId) {
            void dispatchEvent("SUBSCRIPTION_CREATED", { donationId });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = (invoice as any).subscription as string;
        if (!stripeSubscriptionId) break;

        // Find our DB subscription by Stripe subscription ID (stored in payforToken)
        const dbSubscription = await prisma.subscription.findFirst({
          where: { payforToken: stripeSubscriptionId },
          include: { items: true, categoryItems: true },
        });
        if (!dbSubscription) break;

        // Idempotency: skip if we already recorded a donation for this invoice
        const existingForInvoice = await prisma.donation.findFirst({
          where: { subscriptionId: dbSubscription.id, providerOrderId: invoice.id },
        });
        if (existingForInvoice) break;

        // Compute paidAt from invoice timestamp
        const paidAt = new Date((invoice as any).created * 1000);

        // nextBillingDate = one month after this invoice was paid. Stripe owns the
        // actual billing cadence (donors can't pick a day); we just mirror it so
        // the admin UI and cron filters have a usable value. Clamp to the target
        // month's last day to handle edge cases like the 31st.
        const nextBillingDate = new Date(Date.UTC(
          paidAt.getUTCFullYear(),
          paidAt.getUTCMonth() + 1,
          1,
        ));
        const lastDay = new Date(Date.UTC(
          nextBillingDate.getUTCFullYear(),
          nextBillingDate.getUTCMonth() + 1,
          0,
        )).getUTCDate();
        nextBillingDate.setUTCDate(Math.min(paidAt.getUTCDate(), lastDay));
        nextBillingDate.setUTCHours(0, 0, 0, 0);

        const fees = (dbSubscription.amount + dbSubscription.teamSupport) * 0.03;
        const finalTotal =
          dbSubscription.amount +
          dbSubscription.teamSupport +
          (dbSubscription.coverFees ? fees : 0);

        const donorCountrySnapshot =
          (await getDonorCountryCodeForSnapshot(prisma, dbSubscription.donorId)) ??
          undefined;

        await prisma.$transaction(async (tx) => {
          // Check if there is an existing PAID first donation for this invoice.
          // This is the donation created by POST /api/donations before payment.
          // We update it with provider details instead of creating a duplicate.
          const existingPending = await tx.donation.findFirst({
            where: {
              subscriptionId: dbSubscription.id,
              providerOrderId: invoice.id,
              status: "PAID",
            },
          });

          if (existingPending) {
            // First invoice: update the existing donation with provider details
            await tx.donation.update({
              where: { id: existingPending.id },
              data: {
                status: "PAID",
                paidAt,
                providerOrderId: invoice.id,
                providerAuthCode: stripeSubscriptionId,
                providerTxnResult: "Success",
                providerRaw: invoice as any,
              },
            });
          } else {
            // Recurring invoice: create a new PAID donation record
            await tx.donation.create({
              data: {
                amount: dbSubscription.amount,
                amountUSD: dbSubscription.amountUSD ?? dbSubscription.amount,
                teamSupport: dbSubscription.teamSupport,
                coverFees: dbSubscription.coverFees,
                currency: dbSubscription.currency,
                fees: dbSubscription.coverFees ? fees : 0,
                totalAmount: finalTotal,
                status: "PAID",
                paidAt,
                donorCountryCode: donorCountrySnapshot,
                donorId: dbSubscription.donorId,
                subscriptionId: dbSubscription.id,
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
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }
          for (const item of dbSubscription.categoryItems) {
            await tx.category.update({
              where: { id: item.categoryId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }

          // Update subscription billing dates (Stripe drives the actual cadence)
          await tx.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              lastBillingDate: paidAt,
              nextBillingDate: nextBillingDate,
              status: "ACTIVE",
            },
          });
        });
        const paidForInvoice = await prisma.donation.findFirst({
          where: {
            subscriptionId: dbSubscription.id,
            providerOrderId: invoice.id,
            status: "PAID",
          },
          select: { id: true },
        });
        if (paidForInvoice) {
          void sendDonationServerConversions(paidForInvoice.id);
          void dispatchEvent("SUBSCRIPTION_PAYMENT", { donationId: paidForInvoice.id });
        }
        break;
      }

      case "invoice.payment_failed": {
        // Monthly billing failed — log a FAILED donation for audit trail.
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = (invoice as any).subscription as string;
        if (!stripeSubscriptionId) break;

        const dbSubscription = await prisma.subscription.findFirst({
          where: { payforToken: stripeSubscriptionId },
        });
        if (!dbSubscription) break;

        // Idempotency: skip if already recorded
        const existingFailed = await prisma.donation.findFirst({
          where: { subscriptionId: dbSubscription.id, providerOrderId: invoice.id },
        });
        if (existingFailed) break;

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
            amountUSD: dbSubscription.amountUSD ?? dbSubscription.amount,
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

        await prisma.$transaction(async (tx) => {
          const donation = await tx.donation.findUnique({
            where: { id: donationId },
            include: { items: true, categoryItems: true },
          });
          // Idempotency: the row is created with status=PAID by /api/stripe/intent
          // before Stripe confirms payment, so we key off paidAt (only set here).
          if (!donation || donation.paidAt != null) return;

          await tx.donation.update({
            where: { id: donationId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              provider: "STRIPE",
              providerOrderId: intent.id,
              providerAuthCode: intent.id,
              providerTxnResult: "Success",
              providerRaw: intent as never,
            },
          });

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
        });
        void sendDonationServerConversions(donationId);
        void dispatchDonationPaid(donationId);
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
          select: { paidAt: true, status: true },
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
        void dispatchEvent("DONATION_FAILED", { donationId });
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
        void dispatchEvent("DONATION_FAILED", { donationId });
        // Hosted Stripe Checkout expired/failed before payment — seed Meta
        // DonateFailed so the abandoned-checkout cohort feeds lookalikes.
        void sendDonationFailedConversions(donationId);
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
          void dispatchEvent("SUBSCRIPTION_CANCELLED", { userId: dbSubscription.donorId });
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
