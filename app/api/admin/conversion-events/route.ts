import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Query = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stringParam(request: NextRequest, key: string): string | null {
  const value = request.nextUrl.searchParams.get(key);
  return value && value.trim() ? value.trim() : null;
}

function numberParam(request: NextRequest, key: string, fallback: number, max: number): number {
  const raw = Number(request.nextUrl.searchParams.get(key));
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), max);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const platform = stringParam(request, "platform");
  const channel = stringParam(request, "channel");
  const status = stringParam(request, "status");
  const eventName = stringParam(request, "eventName");
  const donationId = stringParam(request, "donationId");
  const search = stringParam(request, "q");
  const limit = numberParam(request, "limit", 50, 200);
  const days = numberParam(request, "days", 7, 90);
  const from = parseDate(request.nextUrl.searchParams.get("from")) ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const to = parseDate(request.nextUrl.searchParams.get("to")) ?? new Date();

  const filter: Query = { createdAt: { $gte: from, $lte: to } };
  if (platform && platform !== "all") filter.platform = platform;
  if (channel && channel !== "all") filter.channel = channel;
  if (status && status !== "all") filter.status = status;
  if (eventName && eventName !== "all") filter.eventName = eventName;
  if (donationId) filter.donationId = donationId;
  if (search) {
    filter.$or = [
      { eventId: { $regex: search, $options: "i" } },
      { eventName: { $regex: search, $options: "i" } },
      { donationId: { $regex: search, $options: "i" } },
      { error: { $regex: search, $options: "i" } },
    ];
  }

  const result = await prisma.$runCommandRaw({
    find: "ConversionEvent",
    filter,
    sort: { createdAt: -1 },
    limit,
    projection: {
      eventId: 1,
      eventName: 1,
      platform: 1,
      channel: 1,
      status: 1,
      dedupKey: 1,
      donationId: 1,
      value: 1,
      currency: 1,
      attempts: 1,
      error: 1,
      sentAt: 1,
      createdAt: 1,
      updatedAt: 1,
      response: 1,
    },
  });

  const batch = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch)
    ? result.cursor.firstBatch
    : [];

  const countResult = await prisma.$runCommandRaw({ count: "ConversionEvent", query: filter }).catch(() => ({ n: batch.length }));
  const total = isRecord(countResult) && typeof countResult.n === "number" ? countResult.n : batch.length;

  return NextResponse.json({
    ok: true,
    total,
    limit,
    from: from.toISOString(),
    to: to.toISOString(),
    filters: { platform, channel, status, eventName, donationId, search },
    events: batch,
  });
}
