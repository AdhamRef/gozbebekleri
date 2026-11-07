import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { queueAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";
import { NOT_SOFT_DELETED, NOT_IMPACT_BACKING } from "@/lib/campaign/soft-delete-filter";
import {
  EMPTY_INSTITUTION_QUICK_DONATION,
  validateInstitutionQuickDonation,
} from "@/lib/quick-donation/institution-config";

/** Public read only. Missing settings never activate any destination. */
export async function GET() {
  try {
    const row = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { quickDonation: true },
    });
    const config = row?.quickDonation
      ? validateInstitutionQuickDonation(row.quickDonation)
      : EMPTY_INSTITUTION_QUICK_DONATION;
    return NextResponse.json({ config }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Fail closed; malformed historical JSON must never enable an unreviewed target.
    return NextResponse.json({ config: EMPTY_INSTITUTION_QUICK_DONATION }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** Protected staff update; no gateway/payment/recurring data is changed. */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "siteContent");
  if (denied) return denied;
  const input: unknown = await request.json().catch(() => null);
  let config;
  try {
    const body = input && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown> : null;
    config = validateInstitutionQuickDonation(body?.config ?? input);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "INVALID_QUICK_DONATION" }, { status: 400 });
  }
  // The public checkout is not integrated yet. Do not allow a direct PUT to enable the widget.
  if (config.enabled) {
    return NextResponse.json({ error: "QUICK_DONATION_ACTIVATION_NOT_RELEASED" }, { status: 409 });
  }
  const ids = [...new Set(config.destinations.filter(d => d.enabled).map(d => d.projectId).filter((id): id is string => Boolean(id)))];
  if (config.enabled && config.destinations.some(d => d.enabled && !d.projectId)) {
    return NextResponse.json({ error: "QUICK_DONATION_UNMAPPED_DESTINATION" }, { status: 400 });
  }
  try {
    if (ids.length) {
      const count = await prisma.campaign.count({
        where: { id: { in: ids }, isActive: true, AND: [NOT_SOFT_DELETED, NOT_IMPACT_BACKING] },
      });
      if (count !== ids.length) return NextResponse.json({ error: "QUICK_DONATION_UNAVAILABLE_PROJECT" }, { status: 400 });
    }
    const old = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" }, select: { id: true },
    });
    const row = old
      ? await prisma.globalSettings.update({
          where: { id: old.id }, data: { quickDonation: config as unknown as Prisma.InputJsonValue },
          select: { quickDonation: true },
        })
      : await prisma.globalSettings.create({
          data: { quickDonation: config as unknown as Prisma.InputJsonValue },
          select: { quickDonation: true },
        });
    const actor = auditActorFromDashboardSession(session!);
    queueAuditLog({
      ...actor, action: "QUICK_DONATION_UPDATE",
      messageAr: "تعديل إعدادات التبرع السريع الخاصة بقرة العيون",
      entityType: "GlobalSettings",
    });
    return NextResponse.json({ config: row.quickDonation }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "QUICK_DONATION_SAVE_UNAVAILABLE" }, { status: 503 });
  }
}
