import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";

// GET /api/admin/tracking — get full settings (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "pixels");
    if (denied) return denied;
    const settings = await prisma.trackingSettings.findFirst();
    if (!settings) {
      return NextResponse.json({
        id: null,
        facebookPixelId:          null,
        facebookAccessToken:      null,
        gaMeasurementId:          null,
        tiktokPixelId:            null,
        tiktokAccessToken:        null,
        googleAdsConversionId:    null,
        googleAdsConversionLabel: null,
        xPixelId:                 null,
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
    const denied = requireAdminOrDashboardPermission(session, "pixels");
    if (denied) return denied;
    const body = await request.json();
    const {
      facebookPixelId,
      facebookAccessToken,
      gaMeasurementId,
      tiktokPixelId,
      tiktokAccessToken,
      googleAdsConversionId,
      googleAdsConversionLabel,
      xPixelId,
    } = body;

    const existing = await prisma.trackingSettings.findFirst();
    const data = {
      ...(facebookPixelId          !== undefined && { facebookPixelId:          facebookPixelId          || null }),
      ...(facebookAccessToken      !== undefined && { facebookAccessToken:      facebookAccessToken      || null }),
      ...(gaMeasurementId          !== undefined && { gaMeasurementId:          gaMeasurementId          || null }),
      ...(tiktokPixelId            !== undefined && { tiktokPixelId:            tiktokPixelId            || null }),
      ...(tiktokAccessToken        !== undefined && { tiktokAccessToken:        tiktokAccessToken        || null }),
      ...(googleAdsConversionId    !== undefined && { googleAdsConversionId:    googleAdsConversionId    || null }),
      ...(googleAdsConversionLabel !== undefined && { googleAdsConversionLabel: googleAdsConversionLabel || null }),
      ...(xPixelId                 !== undefined && { xPixelId:                 xPixelId                 || null }),
    };

    const settings = existing
      ? await prisma.trackingSettings.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.trackingSettings.create({
          data,
        });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      stream: "TEAM",
      action: "TRACKING_SETTINGS_UPDATE",
      messageAr: `${actor.actorName ?? "مسؤول"} عدّل إعدادات التتبع والبكسلات (فيسبوك، GA، تيك توك، Google Ads، X)`,
      entityType: "TrackingSettings",
      entityId: settings.id,
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
