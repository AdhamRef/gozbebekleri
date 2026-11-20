import { NextRequest, NextResponse } from "next/server";
import { resolveCheckoutCancel } from "@/lib/payments/payfor-stripe-fallback";

// GET /api/stripe/fallback/cancel?donationId=…&locale=…
// Stripe Checkout's cancel_url for a PayFor→Stripe fallback. PayFor already failed,
// so leaving Stripe too means both gateways failed → /donation-failed.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const donationId = searchParams.get("donationId") ?? "";
  const locale = (searchParams.get("locale") ?? "en").toLowerCase();
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

  if (!/^[a-f0-9]{24}$/i.test(donationId)) {
    return NextResponse.redirect(`${origin}/${encodeURIComponent(locale)}/donation-failed`);
  }
  try {
    return NextResponse.redirect(await resolveCheckoutCancel({ donationId, locale, origin }));
  } catch (error) {
    console.error("[Stripe fallback cancel] error:", error);
    return NextResponse.redirect(
      `${origin}/${encodeURIComponent(locale)}/donation-failed?donationId=${encodeURIComponent(donationId)}`
    );
  }
}
