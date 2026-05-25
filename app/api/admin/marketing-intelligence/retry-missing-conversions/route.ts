import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { syncDonationConversion } from "@/lib/tracking/donation-conversion-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body?.limit ?? 25) || 25, 100));
  const days = Math.max(1, Math.min(Number(body?.days ?? 7) || 7, 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.donation.findMany({
    where: { status: "PAID", paidAt: { not: null, gte: since }, conversionEventsSentAt: null },
    orderBy: { paidAt: "desc" },
    take: limit,
    select: { id: true, paidAt: true, amount: true, currency: true },
  });

  const results = [];
  for (const row of rows) {
    const result = await syncDonationConversion(row.id);
    results.push({
      donationId: row.id,
      paidAt: row.paidAt?.toISOString() ?? null,
      amount: row.amount,
      currency: row.currency,
      result,
    });
  }

  return NextResponse.json({ ok: true, scanned: rows.length, limit, days, results });
}
