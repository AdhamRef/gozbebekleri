import { after, NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
// Donate (success) CAPI now fires server-side from `dispatchDonationPaid`
// the moment the donation flips to PAID — that's the only path that
// reliably catches donors whose browser never returns from 3DS (mobile
// tab killed, ad-blocker, slow network, no Pixel ID configured). The
// /success page still triggers /api/donations/:id/track-conversion as a
// fallback claim + to fire the browser Pixel using the same stable
// event_id so Meta dedupes browser ↔ server into one conversion.
// DonateFailed stays here so abandoned-card lookalike audiences still
// get the signal on bank rejects.
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";
import { dispatchDonationPaid } from "@/lib/events/dispatch";
import { discardFallbackCard } from "@/lib/payments/fallback-card";
import { handlePayForFailure } from "@/lib/payments/payfor-stripe-fallback";
import { PAYFOR_UNVERIFIED_APPROVAL, verifyPayForRequestEcho, verifyPayForResponseHash } from "@/lib/payfor";

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

  // Log full bank response for debugging
  console.log("[PayFor OK] Bank response:", JSON.stringify(raw, null, 2));

  const orderId = String(raw.OrderId || raw.orderId || "");
  const procReturnCode = String(raw.ProcReturnCode || raw.ProcReturnCode?.toString?.() || raw.procReturnCode || "");
  const txnResult = String(raw.TxnResult || raw.txnResult || "");
  const errorMessage = String(raw.ErrorMessage || raw.errorMessage || "");
  const authCode = String(raw.AuthCode || raw.authCode || "");
  const hostRefNum = String(raw.HostRefNum || raw.hostRefNum || "");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id: donationId },
        include: {
          items: true,
          categoryItems: true,
        },
      });
      if (!donation) return { ok: false as const, reason: "not_found" as const };

      // Idempotency: if already confirmed by a prior callback, just redirect to success
      if (donation.paidAt !== null) return { ok: true as const };

      /* Nothing changes without proof the callback is genuine and about this donation: the bank's
         signature, or our own request signature echoed back (3D-stage failures carry only that).
         A forged POST is ignored and the donor simply sees the failure page (owner, 2026-11-18). */
      const genuine = (orderId === donation.id || (!!donation.providerOrderId && orderId === donation.providerOrderId))
        && (verifyPayForResponseHash(raw, process.env.PAYFOR_MERCHANT_PASS) || verifyPayForRequestEcho(raw, process.env.PAYFOR_MERCHANT_PASS));
      if (!genuine) {
        console.error("[PayFor OK] callback not authenticated; donation left unchanged", { donationId: donation.id, procReturnCode });
        return { ok: false as const, reason: "unverified" as const };
      }

      // Basic linkage check
      if (donation.providerOrderId && orderId && donation.providerOrderId !== orderId) {
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            provider: "PAYFOR",
            providerProcReturnCode: procReturnCode || null,
            providerTxnResult: txnResult || null,
            providerAuthCode: authCode || null,
            providerHostRefNum: hostRefNum || null,
            providerErrorMessage: `OrderId mismatch`,
            providerRaw: raw as any,
          },
        });
        return { ok: false as const, reason: "order_mismatch" as const };
      }

      const isSuccess = procReturnCode === "00" || txnResult.toLowerCase() === "success";
      if (!isSuccess) {
        // Record PayFor's answer but do NOT mark FAILED — handlePayForFailure
        // (below) retries on Stripe first and only fails the donation if that
        // fails too.
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            provider: "PAYFOR",
            providerProcReturnCode: procReturnCode || null,
            providerTxnResult: txnResult || null,
            providerAuthCode: authCode || null,
            providerHostRefNum: hostRefNum || null,
            providerErrorMessage: errorMessage || "Payment failed",
            providerRaw: raw as any,
          },
        });
        return { ok: false as const, reason: "failed" as const, errorMessage: errorMessage || "Payment failed" };
      }

      /* An approval only counts when the bank signed it. A response that says
         "00" but fails the hash is not proof of payment: the donation stays
         unconfirmed (never FAILED, so a genuine charge can still be reconciled
         by hand) and the response is kept for that check. (Minber, with #253.) */
      if (!verifyPayForResponseHash(raw, process.env.PAYFOR_MERCHANT_PASS)) {
        console.error("[PayFor OK] ResponseHash did not verify; donation left unconfirmed", { donationId: donation.id, procReturnCode });
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            providerErrorMessage: PAYFOR_UNVERIFIED_APPROVAL,
            providerRaw: raw as Prisma.InputJsonValue,
          },
        });
        return { ok: false as const, reason: "unverified" as const };
      }

      await tx.donation.update({
        where: { id: donation.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          provider: "PAYFOR",
          providerProcReturnCode: procReturnCode || null,
          providerTxnResult: txnResult || null,
          providerAuthCode: authCode || null,
          providerHostRefNum: hostRefNum || null,
          providerErrorMessage: null,
          providerRaw: raw as any,
        },
      });

      // Apply increments only on confirmed payment
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

      return { ok: true as const };
    });

    if (result.ok) {
      // PayFor took the payment — the Stripe fallback card is no longer needed.
      await discardFallbackCard(donationId).catch(() => {});
      after(() => dispatchDonationPaid(donationId));
      return NextResponse.redirect(new URL(`/${locale}/success/${donationId}`, origin));
    }
    if (result.reason === "failed") {
      const next = await handlePayForFailure({
        donationId,
        locale,
        origin: process.env.APP_URL?.replace(/\/$/, "") ?? origin,
        payforError: result.errorMessage,
      });
      return NextResponse.redirect(next);
    }
    if (result.reason === "order_mismatch") {
      // Suspicious response — never retry it on another gateway.
      await discardFallbackCard(donationId).catch(() => {});
      void sendDonationFailedConversions(donationId);
    }

    return NextResponse.redirect(
      new URL(`/${locale}/donation-failed?donationId=${encodeURIComponent(donationId)}`, origin)
    );
  } catch (e) {
    console.error("PayFor OK callback error:", e);
    return NextResponse.redirect(
      new URL(`/${locale}/donation-failed?donationId=${encodeURIComponent(donationId)}`, origin)
    );
  }
}
