import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { syncDonationConversion } from "@/lib/tracking/donation-conversion-server";

export const dynamic = "force-dynamic";

function legacyOid(id: string) {
  return /^[a-f0-9]{24}$/i.test(id) ? { $oid: id } : id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function hasMetaServerLedger(donationId: string): Promise<boolean> {
  try {
    const result = await prisma.$runCommandRaw({
      count: "ConversionEvent",
      query: {
        platform: "META",
        channel: "server",
        $or: [
          { donationId },
          { donationId: legacyOid(donationId) },
          { eventId: `donate_${donationId}` },
        ],
      },
    });
    return isRecord(result) && typeof result.n === "number" && result.n > 0;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body?.limit ?? 25) || 25, 100));
  const days = Math.max(1, Math.min(Number(body?.days ?? 7) || 7, 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const recentPaid = await prisma.donation.findMany({
    where: { status: "PAID", paidAt: { not: null, gte: since } },
    orderBy: { paidAt: "desc" },
    take: Math.max(limit * 3, limit),
    select: { id: true, paidAt: true, amount: true, currency: true, conversionEventsSentAt: true },
  });

  const rows = [];
  for (const row of recentPaid) {
    if (row.conversionEventsSentAt == null) rows.push(row);
    else if (!(await hasMetaServerLedger(row.id))) rows.push(row);
    if (rows.length >= limit) break;
  }

  const results = [];
  for (const row of rows) {
    if (row.conversionEventsSentAt != null) {
      await prisma.donation.update({ where: { id: row.id }, data: { conversionEventsSentAt: null } });
    }
    const result = await syncDonationConversion(row.id);
    results.push({ donationId: row.id, paidAt: row.paidAt?.toISOString() ?? null, amount: row.amount, currency: row.currency, wasAlreadyMarkedSent: row.conversionEventsSentAt != null, result });
  }

  return NextResponse.json({ ok: true, scanned: rows.length, considered: recentPaid.length, limit, days, results });
}
