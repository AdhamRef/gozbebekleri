import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePayForFailure } from "@/lib/payments/payfor-stripe-fallback";
import { verifyPayForRequestEcho, verifyPayForResponseHash } from "@/lib/payfor";

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const donationId = searchParams.get("donationId") || "";
  const locale = (searchParams.get("locale") || "en").toLowerCase();

  if (!donationId) {
    return NextResponse.redirect(new URL(`/${locale}/donation-failed`, origin));
  }

  const form = await req.formData();
  const raw = Object.fromEntries(form.entries());

  console.error("[PayFor FAIL] Bank response:", JSON.stringify(raw, null, 2));

  const orderId = String(raw.OrderId || raw.orderId || "");
  const procReturnCode = String(raw.ProcReturnCode || raw.procReturnCode || "");
  const txnResult = String(raw.TxnResult || raw.txnResult || "");
  const errorMessage = String(raw.ErrorMessage || raw.errorMessage || "Payment failed");

  try {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { paidAt: true, providerOrderId: true },
    });
    if (!donation) {
      return NextResponse.redirect(new URL(`/${locale}/donation-failed`, origin));
    }
    if (donation.paidAt !== null) {
      return NextResponse.redirect(new URL(`/${locale}/success/${donationId}`, origin));
    }

    /* Only a genuine callback about this donation's order may change it or start the Stripe fallback:
       the bank's signature, or our own request signature echoed back (Minber #253, 2026-11-18). */
    const genuine = (orderId === donationId || (!!donation.providerOrderId && orderId === donation.providerOrderId))
      && (verifyPayForResponseHash(raw, process.env.PAYFOR_MERCHANT_PASS) || verifyPayForRequestEcho(raw, process.env.PAYFOR_MERCHANT_PASS));
    if (!genuine) {
      console.error("[PayFor FAIL] callback not authenticated; donation left unchanged", { donationId });
      return NextResponse.redirect(new URL(`/${locale}/donation-failed?donationId=${encodeURIComponent(donationId)}`, origin));
    }

    // Record PayFor's answer but do NOT mark FAILED yet — the donation is retried
    // on Stripe first; markDonationFailedFinal runs only if that fails too.
    await prisma.donation.update({
      where: { id: donationId },
      data: {
        provider: "PAYFOR",
        providerOrderId: donation.providerOrderId ?? orderId ?? null,
        providerProcReturnCode: procReturnCode || null,
        providerTxnResult: txnResult || null,
        providerErrorMessage: errorMessage || null,
        providerRaw: raw as Record<string, unknown>,
      },
    });

    const next = await handlePayForFailure({
      donationId,
      locale,
      origin: process.env.APP_URL?.replace(/\/$/, "") ?? origin,
      payforError: errorMessage,
    });
    return NextResponse.redirect(next);
  } catch (e) {
    console.error("[PayFor FAIL] Callback error:", e);
    return NextResponse.redirect(
      new URL(`/${locale}/donation-failed?donationId=${encodeURIComponent(donationId)}`, origin)
    );
  }
}
