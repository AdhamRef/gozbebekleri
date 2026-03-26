import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getUserIdsMatchingBadge } from "@/lib/badge-criteria";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const badge = await prisma.badge.findUnique({
      where: { id },
      select: { criteria: true },
    });
    if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    const userIds = await getUserIdsMatchingBadge(badge.criteria);
    return NextResponse.json({ userIds });
  } catch (error) {
    console.error("Error fetching badge users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
