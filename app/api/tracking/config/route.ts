import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tracking/config — public browser config only. No access tokens or API secrets.
export async function GET() {
  try {
    const row = await prisma.trackingSettings.findFirst();
    return NextResponse.json({
      facebookPixelId: row?.facebookPixelId ?? null,
      gaMeasurementId: row?.gaMeasurementId ?? null,
      googleAdsConversionId: row?.googleAdsConversionId ?? null,
      googleAdsConversionLabel: row?.googleAdsConversionLabel ?? null,
      tiktokPixelId: row?.tiktokPixelId ?? null,
      xPixelId: row?.xPixelId ?? null,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    console.error("Error fetching tracking config:", e);
    return NextResponse.json({
      facebookPixelId: null,
      gaMeasurementId: null,
      googleAdsConversionId: null,
      googleAdsConversionLabel: null,
      tiktokPixelId: null,
      xPixelId: null,
    }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
