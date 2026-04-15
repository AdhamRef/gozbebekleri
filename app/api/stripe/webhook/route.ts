import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

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
            if (!donation || donation.status === "PAID") return;

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

        // Compute nextBillingDate using the subscription's chosen billingDay.
        // e.g. paid on May 19, billingDay = 19 → nextBillingDate = June 19
        const bd = dbSubscription.billingDay;
        const nextBillingDate = new Date(Date.UTC(paidAt.getUTCFullYear(), paidAt.getUTCMonth() + 1, 1));
        if (bd != null && bd >= 1 && bd <= 31) {
          const lastDay = new Date(Date.UTC(
            nextBillingDate.getUTCFullYear(),
            nextBillingDate.getUTCMonth() + 1,
            0,
          )).getUTCDate();
          nextBillingDate.setUTCDate(Math.min(bd, lastDay));
        }
        nextBillingDate.setUTCHours(0, 0, 0, 0);

        const fees = (dbSubscription.amount + dbSubscription.teamSupport) * 0.03;
        const finalTotal =
          dbSubscription.amount +
          dbSubscription.teamSupport +
          (dbSubscription.coverFees ? fees : 0);

        await prisma.$transaction(async (tx) => {
          // Check if there is an existing PENDING first donation for this invoice.
          // This is the donation created by POST /api/donations before payment.
          // We mark it PAID instead of creating a duplicate.
          const existingPending = await tx.donation.findFirst({
            where: {
              subscriptionId: dbSubscription.id,
              providerOrderId: invoice.id,
              status: "PENDING",
            },
          });

          if (existingPending) {
            // First invoice: update the existing PENDING donation to PAID
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

          // Update subscription billing dates respecting the chosen billingDay
          await tx.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              lastBillingDate: paidAt,
              nextBillingDate: nextBillingDate,
              status: "ACTIVE",
            },
          });
        });
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

        await prisma.donation.create({
          data: {
            amount: dbSubscription.amount,
            amountUSD: dbSubscription.amountUSD ?? dbSubscription.amount,
            teamSupport: dbSubscription.teamSupport,
            coverFees: dbSubscription.coverFees,
            currency: dbSubscription.currency,
            fees: dbSubscription.coverFees ? fees : 0,
            totalAmount: finalTotal,
            status: "FAILED",
            donorId: dbSubscription.donorId,
            subscriptionId: dbSubscription.id,
            paymentMethod: "CARD",
            provider: "STRIPE",
            providerOrderId: invoice.id,
            providerErrorMessage: "Monthly billing failed via Stripe",
            providerRaw: invoice as any,
          },
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

        await prisma.$transaction(async (tx) => {
          const donation = await tx.donation.findUnique({
            where: { id: donationId },
            include: { items: true, categoryItems: true },
          });
          if (!donation || donation.status === "PAID") return;

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
