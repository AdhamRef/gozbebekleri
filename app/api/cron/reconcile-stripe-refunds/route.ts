import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { isCronAuthorizationValid } from "@/lib/communication/cron-auth";
import { reconcileDeferredStripeRefunds } from "@/lib/donations/stripe-refund-deferred";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Replays signed-but-early refunds; never initiates or creates a Stripe refund. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorizationValid(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia" as never,
    });
    const result = await reconcileDeferredStripeRefunds(prisma, stripe, { dryRun });
    // REVIEW_REQUIRED records remain durable for manual reconciliation.
    if (result.reviewRequired > 0 || result.deferred > 0) {
      console.warn("Stripe refund reconciliation pending", result);
    }
    return NextResponse.json({ ok: true, dryRun, ...result });
  } catch (error) {
    console.error("Stripe deferred refund reconciliation failed", error);
    return NextResponse.json({ error: "REFUND_RECONCILIATION_UNAVAILABLE" }, { status: 500 });
  }
}
