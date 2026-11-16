import { NextRequest, NextResponse } from "next/server";
import { resolveFallbackReturn } from "@/lib/payments/payfor-stripe-fallback";

// GET /api/stripe/fallback/return?donationId=…&locale=…
// Stripe sends the donor here after 3D Secure on a PayFor→Stripe fallback charge.
// The PaymentIntent is looked up from the donation (never trusted from the query).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const donationId = searchParams.get("donationId") ?? "";
  const locale = (searchParams.get("locale") ?? "en").toLowerCase();
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

  if (!/^[a-f0-9]{24}$/i.test(donationId)) {
    return NextResponse.redirect(`${origin}/${encodeURIComponent(locale)}/donation-failed`);
  }

  try {
    const url = await resolveFallbackReturn({ donationId, locale, origin });
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[Stripe fallback return] error:", error);
    return NextResponse.redirect(
      `${origin}/${encodeURIComponent(locale)}/donation-failed?donationId=${encodeURIComponent(donationId)}`
    );
  }
}
