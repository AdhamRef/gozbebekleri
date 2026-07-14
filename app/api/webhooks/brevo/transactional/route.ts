import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { integrationSettingsService } from "@/lib/integration-settings/prisma-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_STATUS: Record<string, string> = {
  delivered: "DELIVERED", opened: "OPENED", uniqueOpened: "OPENED", click: "CLICKED",
  hardBounce: "FAILED", hard_bounce: "FAILED", softBounce: "FAILED", soft_bounce: "FAILED",
  blocked: "FAILED", spam: "FAILED", invalid_email: "FAILED", error: "FAILED",
};
const SMS_STATUS: Record<string, string> = {
  delivered: "DELIVERED", sent: "SENT", hardBounce: "FAILED", softBounce: "FAILED",
  rejected: "FAILED", blocked: "FAILED", error: "FAILED",
};

function timestampField(status: string): Record<string, Date> {
  const now = new Date();
  if (status === "DELIVERED") return { deliveredAt: now };
  if (status === "READ" || status === "OPENED") return { openedAt: now };
  if (status === "CLICKED") return { clickedAt: now };
  if (status === "FAILED") return { failedAt: now };
  return {};
}

function safeTokenMatch(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function activeWebhookSecret(): Promise<string | null> {
  const active = await integrationSettingsService.getResolvedValue("BREVO", "WEBHOOK_SECRET").catch(() => null);
  return active || process.env.BREVO_SMS_WEBHOOK_SECRET?.trim() || null;
}

export async function POST(req: NextRequest) {
  const secret = await activeWebhookSecret();
  const isProduction = process.env.NODE_ENV === "production";
  if (!secret) {
    if (isProduction) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  } else if (!safeTokenMatch(req.nextUrl.searchParams.get("token"), secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: true }, { status: 200 });

  try {
    const event = String(body.event ?? "").trim();
    const messageId = String(body["message-id"] ?? body.messageId ?? "").trim();
    const isSms = "type" in body ? String(body.type).toLowerCase().includes("sms") : false;
    const status = (isSms ? SMS_STATUS : EMAIL_STATUS)[event];
    if (process.env.DATABASE_URL && messageId && status) {
      await prisma.communicationDelivery.updateMany({
        where: { providerMessageId: messageId },
        data: { status, ...timestampField(status) },
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, processed: !!(messageId && status) }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "brevo", webhookProtected: !!(await activeWebhookSecret()) }, { status: 200 });
}
