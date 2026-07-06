import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookChallenge, verifyWebhookSignature, parseWebhookPayload } from "@/lib/communication/providers/meta-whatsapp/webhooks";
import { processWhatsappEvents } from "@/lib/communication/webhook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta WhatsApp Cloud API webhook. Public endpoint (Meta calls it) — secured by the verify token
 * (GET handshake) and the X-Hub-Signature-256 payload signature (POST). Never exposes secrets and
 * always responds 200 to genuine, signature-valid notifications so Meta does not retry needlessly.
 */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const challenge = verifyWebhookChallenge(sp.get("hub.mode"), sp.get("hub.verify_token"), sp.get("hub.challenge"));
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const verdict = verifyWebhookSignature(rawBody, signature);
  if (verdict === "invalid") {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }
  if (verdict === "unconfigured") {
    // In production the app secret MUST be set — reject unverifiable payloads. In development we
    // accept but warn, so the flow can be exercised without a signature.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ ok: false, error: "signature verification not configured" }, { status: 401 });
    }
    console.warn("[whatsapp webhook] META_WHATSAPP_APP_SECRET missing — accepting unverified payload (development only)");
  }

  try {
    const payload = JSON.parse(rawBody);
    const events = parseWebhookPayload(payload);
    const summary = await processWhatsappEvents(events);
    return NextResponse.json({ ok: true, summary, signatureVerified: verdict === "valid" }, { status: 200 });
  } catch (error) {
    // Never throw an unsafe error back to Meta; acknowledge so it is not retried into a loop.
    console.error("whatsapp webhook processing failed", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
