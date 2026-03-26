import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { isValidReferralCode } from "@/lib/referral";

/** GET /api/referrals - List all referrals (admin only) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const referrals = await prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { donations: true } },
      },
    });
    return NextResponse.json(
      referrals.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        cookieExpiryDays: r.cookieExpiryDays,
        createdAt: r.createdAt,
        donationsCount: r._count.donations,
      }))
    );
  } catch (error) {
    console.error("Error listing referrals:", error);
    return NextResponse.json(
      { error: "Failed to list referrals" },
      { status: 500 }
    );
  }
}

/** POST /api/referrals - Create referral (admin only). Code stored lowercase. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { code, name, cookieExpiryDays: rawExpiry } = body;
    const raw = typeof code === "string" ? code.trim() : "";
    if (!raw) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }
    if (!isValidReferralCode(raw)) {
      return NextResponse.json(
        { error: "Code must be 1–64 characters, letters, numbers, underscore, or hyphen" },
        { status: 400 }
      );
    }
    const codeLower = raw.toLowerCase();
    const existing = await prisma.referral.findUnique({
      where: { code: codeLower },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This referral code already exists" },
        { status: 409 }
      );
    }
    // cookieExpiryDays: number (days) or 0 for unlimited. Default 30.
    let cookieExpiryDays = 30;
    if (typeof rawExpiry === "number" && rawExpiry >= 0) {
      cookieExpiryDays = rawExpiry;
    }

    const referral = await prisma.referral.create({
      data: {
        code: codeLower,
        name: typeof name === "string" ? name.trim() || null : null,
        cookieExpiryDays,
      },
    });
    return NextResponse.json(referral);
  } catch (error) {
    console.error("Error creating referral:", error);
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 }
    );
  }
}
