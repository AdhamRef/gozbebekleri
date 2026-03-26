import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

// GET /api/admin/tracking — get full settings (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await prisma.trackingSettings.findFirst();
    if (!settings) {
      return NextResponse.json({
        id: null,
        facebookPixelId: null,
        facebookAccessToken: null,
        gaMeasurementId: null,
        tiktokPixelId: null,
        xPixelId: null,
      });
    }
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Error fetching tracking settings:", e);
    return NextResponse.json(
      { error: "Failed to fetch tracking settings" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/tracking — update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      facebookPixelId,
      facebookAccessToken,
      gaMeasurementId,
      tiktokPixelId,
      xPixelId,
    } = body;

    const existing = await prisma.trackingSettings.findFirst();
    const data = {
      ...(facebookPixelId !== undefined && { facebookPixelId: facebookPixelId || null }),
      ...(facebookAccessToken !== undefined && { facebookAccessToken: facebookAccessToken || null }),
      ...(gaMeasurementId !== undefined && { gaMeasurementId: gaMeasurementId || null }),
      ...(tiktokPixelId !== undefined && { tiktokPixelId: tiktokPixelId || null }),
      ...(xPixelId !== undefined && { xPixelId: xPixelId || null }),
    };

    const settings = existing
      ? await prisma.trackingSettings.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.trackingSettings.create({
          data,
        });

    return NextResponse.json(settings);
  } catch (e) {
    console.error("Error updating tracking settings:", e);
    return NextResponse.json(
      { error: "Failed to update tracking settings" },
      { status: 500 }
    );
  }
}
