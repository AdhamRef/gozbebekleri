import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Search real donors to add to a list. Read-only; returns only fields the dashboard already shows. */
export async function GET(req: NextRequest) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ donors: [] }, { headers: operationsNoStoreHeaders });
  if (!process.env.DATABASE_URL) return NextResponse.json({ donors: [] }, { headers: operationsNoStoreHeaders });

  const donors = await prisma.user
    .findMany({
      where: {
        role: "DONOR",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true, preferredLang: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  // Best-effort, read-only: attach the last successful donation date so the picker can show context.
  // Never affects donation logic; failures degrade gracefully to no date.
  const ids = donors.map((d) => d.id);
  const lastDonationMap = new Map<string, string>();
  if (ids.length) {
    const grouped = await prisma.donation
      .groupBy({ by: ["donorId"], where: { donorId: { in: ids }, status: "PAID" }, _max: { paidAt: true, createdAt: true } })
      .catch(() => [] as { donorId: string; _max: { paidAt: Date | null; createdAt: Date | null } }[]);
    for (const g of grouped) {
      const when = g._max.paidAt ?? g._max.createdAt;
      if (when) lastDonationMap.set(g.donorId, when.toISOString());
    }
  }

  const enriched = donors.map((d) => ({ ...d, lastDonationAt: lastDonationMap.get(d.id) ?? null }));
  return NextResponse.json({ donors: enriched }, { headers: operationsNoStoreHeaders });
}
