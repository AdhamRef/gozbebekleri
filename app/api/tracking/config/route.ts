import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COLLECTION = "TrackingSettings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getRawTrackingSettings(): Promise<Record<string, unknown> | null> {
  const result = await prisma.$runCommandRaw({
    find: COLLECTION,
    limit: 1,
    sort: { createdAt: 1 },
  });
  const batch = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch)
    ? result.cursor.firstBatch
    : [];
  return (batch[0] as Record<string, unknown> | undefined) ?? null;
}

function publicString(row: Record<string, unknown> | null, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

// GET /api/tracking/config — public browser config only. No access tokens or API secrets.
export async function GET() {
  try {
    const row = await getRawTrackingSettings();
    return NextResponse.json({
      facebookPixelId: publicString(row, "facebookPixelId"),
      gaMeasurementId: publicString(row, "gaMeasurementId"),
      googleAdsConversionId: publicString(row, "googleAdsConversionId"),
      googleAdsConversionLabel: publicString(row, "googleAdsConversionLabel"),
      tiktokPixelId: publicString(row, "tiktokPixelId"),
      xPixelId: publicString(row, "xPixelId"),
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
