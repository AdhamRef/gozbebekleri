import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PlatformHealth = { platform: string; label: string; ready: boolean; missing: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function has(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function platform(platform: string, label: string, fields: string[], settings: Record<string, unknown> | null): PlatformHealth {
  const missing = fields.filter((field) => !has(settings, field));
  return { platform, label, ready: missing.length === 0, missing };
}

async function getTrackingSettings() {
  const result = await prisma.$runCommandRaw({ find: "TrackingSettings", limit: 1, sort: { createdAt: 1 } });
  const batch = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch : [];
  return (batch[0] as Record<string, unknown> | undefined) ?? null;
}

async function countConversionEvents(filter: Record<string, unknown>) {
  const result = await prisma.$runCommandRaw({ count: "ConversionEvent", query: filter });
  return isRecord(result) && typeof result.n === "number" ? result.n : 0;
}

async function recentConversionEvents() {
  const result = await prisma.$runCommandRaw({
    find: "ConversionEvent",
    sort: { createdAt: -1 },
    limit: 12,
    projection: { request: 0, response: 0 },
  });
  const batch = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch : [];
  return batch;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const settings = await getTrackingSettings();
  const platforms = [
    platform("META", "Meta Pixel + CAPI", ["facebookPixelId", "facebookAccessToken"], settings),
    platform("GA4", "Google Analytics 4", ["gaMeasurementId", "gaApiSecret"], settings),
    platform("GOOGLE_ADS", "Google Ads Conversion", ["googleAdsConversionId", "googleAdsConversionLabel"], settings),
    platform("TIKTOK", "TikTok Pixel + Events API", ["tiktokPixelId", "tiktokAccessToken"], settings),
    platform("X", "X Pixel / Conversions", ["xPixelId", "xAccessToken"], settings),
  ];

  const [paidLast7d, checkoutRowsLast7d, failedLast7d, missingServerConversions, sent, failed, skipped, recent] = await Promise.all([
    prisma.donation.count({ where: { status: "PAID", paidAt: { not: null, gte: since } } }),
    prisma.donation.count({ where: { createdAt: { gte: since } } }),
    prisma.donation.count({ where: { status: "FAILED", createdAt: { gte: since } } }),
    prisma.donation.count({ where: { status: "PAID", paidAt: { not: null, gte: since }, conversionEventsSentAt: null } }),
    countConversionEvents({ createdAt: { $gte: since }, status: "SENT" }),
    countConversionEvents({ createdAt: { $gte: since }, status: "FAILED" }),
    countConversionEvents({ createdAt: { $gte: since }, status: "SKIPPED" }),
    recentConversionEvents(),
  ]);

  const readiness = Math.round((platforms.filter((p) => p.ready).length / platforms.length) * 100);
  const delivery = paidLast7d === 0 ? 100 : Math.max(0, Math.round(((paidLast7d - missingServerConversions) / paidLast7d) * 100));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    window: { days: 7, since: since.toISOString() },
    scores: { readiness, delivery, overall: Math.round((readiness + delivery) / 2) },
    platforms,
    donations: { checkoutRowsLast7d, paidLast7d, failedLast7d, missingServerConversions },
    conversionEvents: { sentLast7d: sent, failedLast7d: failed, skippedLast7d: skipped, recent },
    links: {
      campaignBuilder: "/dashboard/link-generator",
      ads: "/dashboard/ads",
      pixels: "/dashboard/pixels",
      connections: "/dashboard/marketing/connections",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
