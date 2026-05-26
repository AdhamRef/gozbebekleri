import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { metaDonationEventId } from "@/lib/tracking/canonical";
import { recordConversionEvent, type ConversionEventStatus, type ConversionPlatform } from "@/lib/tracking/conversion-event-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORMS = new Set<ConversionPlatform>(["META", "GOOGLE_ADS", "TIKTOK", "X"]);
const STATUSES = new Set<ConversionEventStatus>(["SENT", "FAILED", "SKIPPED"]);

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "missing donation id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const platform = str((body as Record<string, unknown>).platform) as ConversionPlatform | null;
  const eventName = str((body as Record<string, unknown>).eventName) || "Donate";
  const eventId = str((body as Record<string, unknown>).eventId);
  const status = (str((body as Record<string, unknown>).status) || "SENT") as ConversionEventStatus;

  if (!platform || !PLATFORMS.has(platform)) return NextResponse.json({ ok: false, error: "invalid platform" }, { status: 400 });
  if (!STATUSES.has(status)) return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });

  const expectedEventId = metaDonationEventId(id, "success");
  if (eventId !== expectedEventId) {
    return NextResponse.json({ ok: false, error: "event id mismatch", expectedEventId }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({
    where: { id },
    select: { id: true, status: true, paidAt: true, amount: true, amountUSD: true, totalAmount: true, currency: true },
  });
  if (!donation) return NextResponse.json({ ok: false, error: "donation not found" }, { status: 404 });

  const value = num((body as Record<string, unknown>).value) ?? Number(donation.amount ?? donation.amountUSD ?? donation.totalAmount ?? 0);
  const currency = str((body as Record<string, unknown>).currency) ?? donation.currency ?? "USD";

  if (donation.status !== "PAID" || donation.paidAt == null) {
    await recordConversionEvent({
      donationId: id,
      eventId: expectedEventId,
      eventName,
      platform,
      channel: "browser",
      status: "SKIPPED",
      dedupKey: expectedEventId,
      value,
      currency,
      error: `not paid (status=${donation.status})`,
      request: { source: "success_page", platform, eventName, eventId },
    });
    return NextResponse.json({ ok: false, skipped: true, reason: "donation not paid" });
  }

  await recordConversionEvent({
    donationId: id,
    eventId: expectedEventId,
    eventName,
    platform,
    channel: "browser",
    status,
    dedupKey: expectedEventId,
    value,
    currency,
    error: str((body as Record<string, unknown>).error),
    request: {
      source: "success_page",
      platform,
      eventName,
      eventId,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    response: { accepted: true, recorded_at: new Date().toISOString() },
    sentAt: status === "SENT" ? new Date() : null,
  });

  return NextResponse.json({ ok: true });
}
