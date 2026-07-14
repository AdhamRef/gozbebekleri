import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brevo transactional webhook (email + SMS delivery events). Public endpoint (Brevo calls it).
 *
 * Brevo does not sign transactional webhooks, so we require a matching `?token=` on the URL as a shared
 * secret (`BREVO_SMS_WEBHOOK_SECRET`). Security posture:
 *   - PRODUCTION: fail-closed. If the secret is missing → 401 and NO processing / NO DB write. If the
 *     secret is set → the `?token=` must match.
 *   - DEVELOPMENT: if the secret is missing, allow a safe no-op for local testing (still only advances
 *     an existing delivery); if set, the token must match.
 * We only ADVANCE an already-accepted delivery (matched by providerMessageId) to DELIVERED/READ/
 * OPENED/CLICKED/FAILED — we never create or fake a SENT here. Always 200 (once authorized) so Brevo
 * does not retry.
 */

const EMAIL_STATUS: Record<string, string> = {
  delivered: "DELIVERED",
  opened: "OPENED",
  uniqueOpened: "OPENED",
  click: "CLICKED",
  hardBounce: "FAILED",
  hard_bounce: "FAILED",
  softBounce: "FAILED",
  soft_bounce: "FAILED",
  blocked: "FAILED",
  spam: "FAILED",
  invalid_email: "FAILED",
  error: "FAILED",
};
const SMS_STATUS: Record<string, string> = {
  delivered: "DELIVERED",
  sent: "SENT",
  hardBounce: "FAILED",
  softBounce: "FAILED",
  rejected: "FAILED",
  blocked: "FAILED",
  error: "FAILED",
};

function timestampField(status: string): Record<string, Date> {
  const now = new Date();
  if (status === "DELIVERED") return { deliveredAt: now };
  if (status === "READ" || status === "OPENED") return { openedAt: now };
  if (status === "CLICKED") return { clickedAt: now };
  if (status === "FAILED") return { failedAt: now };
  return {};
}

export async function POST(req: NextRequest) {
  // Shared-secret gate — fail-closed in production.
  const secret = process.env.BREVO_SMS_WEBHOOK_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  if (!secret) {
    // Production without a configured secret must never process events (no DB writes).
    if (isProduction) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    // Development: allow a safe no-op path for local testing (still only advances existing deliveries).
  } else {
    const token = req.nextUrl.searchParams.get("token");
    if (token !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: true }, { status: 200 });

  try {
    const event = String(body.event ?? "").trim();
    const messageId = String(body["message-id"] ?? body.messageId ?? "").trim();
    const isSms = "type" in body ? String(body.type).toLowerCase().includes("sms") : false;
    const status = (isSms ? SMS_STATUS : EMAIL_STATUS)[event];

    if (process.env.DATABASE_URL && messageId && status) {
      // Only advance a delivery that we already accepted (has this providerMessageId). Never fake.
      await prisma.communicationDelivery
        .updateMany({ where: { providerMessageId: messageId }, data: { status, ...timestampField(status) } })
        .catch(() => {});
    }
    return NextResponse.json({ ok: true, processed: !!(messageId && status) }, { status: 200 });
  } catch (error) {
    console.error("brevo webhook processing failed", error);
    // Acknowledge to avoid retry storms; never expose internals.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  // Health/verification ping.
  return NextResponse.json({ ok: true, provider: "brevo", configured: !!process.env.BREVO_API_KEY }, { status: 200 });
}
