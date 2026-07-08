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

  return NextResponse.json({ donors }, { headers: operationsNoStoreHeaders });
}
