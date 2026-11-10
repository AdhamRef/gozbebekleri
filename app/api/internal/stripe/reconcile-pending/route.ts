import { NextRequest, NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripeOneTimeIntentCanSettle } from "@/lib/donations/stripe-charge-attempt";
import { verifiedUsdCredit } from "@/lib/donations/verified-usd-credit";
import { dispatchDonationPaid } from "@/lib/events/dispatch";

// Only an explicitly provisioned internal operator/cron credential can cause
// financial recovery. Public donation GET and browser retry never call here.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const provided = req.headers.get("authorization");
  if (!provided?.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(provided.slice(7), "utf8");
  const original = Buffer.from(secret, "utf8");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}
const headers = { "Cache-Control": "no-store" };
const unavailable = () => NextResponse.json({ error: "Unavailable" }, { status: 404, headers });

export async function POST(req: NextRequest) {
  if (!authorized(req)) return unavailable();
  const body = await req.json().catch(() => null) as { donationId?: unknown } | null;
  const id = body?.donationId;
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid donation reference" }, { status: 400, headers });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Stripe unavailable" }, { status: 503, headers });
  const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  try {
    const snapshot = await prisma.donation.findUnique({
      where: { id },
      select: {
        id: true, donorId: true, provider: true, providerOrderId: true,
        paidAt: true, totalAmount: true, currency: true, subscriptionId: true,
        stripeChargeAttempt: true,
      },
    });
    if (!snapshot || snapshot.provider !== "STRIPE" || snapshot.subscriptionId ||
        !snapshot.providerOrderId?.startsWith("pi_")) return unavailable();
    if (snapshot.paidAt) return NextResponse.json({ status: "ALREADY_SETTLED" }, { headers });
    // Retrieval by a persisted immutable PI ID only; never create an intent,
    // and never treat Stripe Search absence as evidence for a second attempt.
    const intent = await stripe.paymentIntents.retrieve(snapshot.providerOrderId);
    if (!stripeOneTimeIntentCanSettle(snapshot, intent)) {
      return NextResponse.json({ status: "PENDING_VERIFICATION" }, { status: 409, headers });
    }

    let settled = false;
    for (let n = 0; n < 4; n++) {
      try {
        settled = await prisma.$transaction(async tx => {
          const donation = await tx.donation.findUnique({
            where: { id }, include: { items: true, categoryItems: true },
          });
          if (!donation || donation.paidAt || donation.providerOrderId !== intent.id ||
              !stripeOneTimeIntentCanSettle(donation, intent)) return false;
          // Financial currency normalization matches signed webhook logic;
          // never credit a non-USD amount as if it were USD.
          const campaigns = donation.items.map(item => ({
            id: item.campaignId, credit: verifiedUsdCredit(item.amount, item.amountUSD, donation.currency),
          }));
          const categories = donation.categoryItems.map(item => ({
            id: item.categoryId, credit: verifiedUsdCredit(item.amount, item.amountUSD, donation.currency),
          }));
          await tx.donation.update({
            where: { id },
            data: {
              status: "PAID", paidAt: new Date(),
              providerOrderId: intent.id, providerAuthCode: intent.id,
              providerTxnResult: "Success",
            },
          });
          for (const item of campaigns) if (item.credit !== null) {
            await tx.campaign.update({
              where: { id: item.id }, data: { currentAmount: { increment: item.credit } },
            });
          }
          for (const item of categories) if (item.credit !== null) {
            await tx.category.update({
              where: { id: item.id }, data: { currentAmount: { increment: item.credit } },
            });
          }
          return true;
        });
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== "P2034" || n === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, (n + 1) * 25));
      }
    }
    if (settled) after(() => dispatchDonationPaid(id));
    return NextResponse.json({ status: settled ? "SETTLED" : "ALREADY_SETTLED" }, { headers });
  } catch {
    // Do not disclose provider/account/DB internals to callers.
    return NextResponse.json({ status: "PENDING_VERIFICATION" }, { status: 503, headers });
  }
}
