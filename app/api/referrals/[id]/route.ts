import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";

/** GET /api/referrals/[id] - Get one referral (admin only) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: { _count: { select: { donations: true } } },
    });
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: referral.id,
      code: referral.code,
      name: referral.name,
      cookieExpiryDays: referral.cookieExpiryDays,
      createdAt: referral.createdAt,
      donationsCount: referral._count.donations,
    });
  } catch (error) {
    console.error("Error fetching referral:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral" },
      { status: 500 }
    );
  }
}
