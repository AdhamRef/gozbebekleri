import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tracking/config — public: only pixel IDs for client-side scripts (no tokens)
export async function GET() {
  try {
    const row = await prisma.trackingSettings.findFirst();
    return NextResponse.json({
      facebookPixelId: row?.facebookPixelId ?? null,
      gaMeasurementId: row?.gaMeasurementId ?? null,
      tiktokPixelId: row?.tiktokPixelId ?? null,
      xPixelId: row?.xPixelId ?? null,
    });
  } catch (e) {
    console.error("Error fetching tracking config:", e);
    return NextResponse.json(
      { facebookPixelId: null, gaMeasurementId: null, tiktokPixelId: null, xPixelId: null },
      { status: 200 }
    );
  }
}
