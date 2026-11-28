import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { sessionHasDashboardPermission } from "@/lib/dashboard/permissions";
import { flattenGatewayRaw } from "@/lib/donations/gateway-raw";

/**
 * What the payment gateway told us about one donation: the references a finance user needs to find the
 * transaction in PayFor's (Ziraat) or Stripe's own panel, plus the stored gateway answer with every card
 * number, key, hash and token masked.
 *
 * Gozbebekleri version of Minber's route (#308), READ-ONLY and database-only: it never calls a gateway,
 * never decrypts card data, and never captures, settles, fails or notifies. Minber's PayPal/Albaraka
 * inspection and financial-summary parts are not ported (Gozbebekleri has PayFor and Stripe only).
 */
export const dynamic = "force-dynamic";

const lastFour = (masked: string | null | undefined) => {
  const digits = String(masked ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = (["revenue", "monthly", "referrals"] as const).some((p) => sessionHasDashboardPermission(session, p));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const donation = await prisma.donation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      totalAmount: true,
      amountUSD: true,
      paidAmount: true,
      paidCurrency: true,
      createdAt: true,
      paidAt: true,
      paymentMethod: true,
      provider: true,
      providerOrderId: true,
      providerTxnType: true,
      providerProcReturnCode: true,
      providerTxnResult: true,
      providerAuthCode: true,
      providerHostRefNum: true,
      providerErrorMessage: true,
      providerRaw: true,
      paypalOrderId: true,
      paypalCaptureId: true,
      billingReason: true,
      subscription: { select: { id: true, stripeSubscriptionId: true, payforMaskedPan: true } },
    },
  });
  if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { entries: raw, truncated: rawTruncated } = flattenGatewayRaw(donation.providerRaw);
  const maskedPan = donation.subscription?.payforMaskedPan ?? null;

  return NextResponse.json({
    id: donation.id,
    financialSummary: null,
    provider: donation.provider,
    paymentMethod: donation.paymentMethod,
    status: donation.status,
    amount: donation.amount,
    currency: donation.currency,
    totalAmount: donation.totalAmount,
    amountUSD: donation.amountUSD,
    paidAmount: donation.paidAmount,
    paidCurrency: donation.paidCurrency,
    createdAt: donation.createdAt,
    paidAt: donation.paidAt,
    billingReason: donation.billingReason,
    refs: {
      providerOrderId: donation.providerOrderId,
      providerAuthCode: donation.providerAuthCode,
      providerHostRefNum: donation.providerHostRefNum,
      paypalOrderId: donation.paypalOrderId,
      paypalCaptureId: donation.paypalCaptureId,
      stripeSubscriptionId: donation.subscription?.stripeSubscriptionId ?? null,
      subscriptionId: donation.subscription?.id ?? null,
      cardLast4: lastFour(maskedPan),
      maskedPan,
    },
    txn: {
      type: donation.providerTxnType,
      result: donation.providerTxnResult,
      returnCode: donation.providerProcReturnCode,
      errorMessage: donation.providerErrorMessage,
    },
    raw,
    rawTruncated,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
