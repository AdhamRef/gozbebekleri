import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const locale = request.nextUrl.searchParams.get("locale") || "ar";
    const badges = await prisma.badge.findMany({
      orderBy: { order: "asc" },
      include: {
        translations: {
          where: { locale },
          take: 1,
          select: { name: true },
        },
      },
    });
    const items = badges.map((b) => ({
      id: b.id,
      name: b.name,
      color: b.color,
      criteria: b.criteria,
      order: b.order,
      createdAt: b.createdAt,
      translatedName: b.translations[0]?.name ?? b.name,
    }));
    return NextResponse.json({ badges: items });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, color, criteria, order, translations } = body;
    if (!name || !criteria?.type) {
      return NextResponse.json(
        { error: "Name and criteria.type are required" },
        { status: 400 }
      );
    }
    const badge = await prisma.badge.create({
      data: {
        name: name,
        color: color || "#3b82f6",
        criteria: criteria,
        order: order ?? 0,
        translations:
          translations && Object.keys(translations).length > 0
            ? {
                create: Object.entries(translations).map(([locale, n]) => ({
                  locale,
                  name: (n as string) || name,
                })),
              }
            : undefined,
      },
      include: { translations: true },
    });
    return NextResponse.json(badge);
  } catch (error) {
    console.error("Error creating badge:", error);
    return NextResponse.json({ error: "Failed to create badge" }, { status: 500 });
  }
}
