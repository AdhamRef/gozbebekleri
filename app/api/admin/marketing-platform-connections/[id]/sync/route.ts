import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import {
  evaluateReadiness,
  isPlatformKey,
  type PlatformKey,
} from "@/lib/marketing/platform-connection-requirements";
import { redactSecretsFromMetadata } from "@/lib/marketing/secrets";

/**
 * Trigger a sync. This phase does NOT implement actual platform-API
 * fetching — see future Platform API Sync work. We:
 *   - validate config and return `missing_config` if incomplete
 *   - return `not_implemented` for everything else (no sync client built yet)
 *   - never crash
 *   - record the attempt via AuditLog so the operator can see they pressed it
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "platformConnections");
  if (denied) return denied;

  const { id } = await params;
  const row = await prisma.marketingPlatformConnection.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPlatformKey(row.platform)) {
    return NextResponse.json({ error: "Stored platform unknown" }, { status: 500 });
  }
  const platform = row.platform as PlatformKey;
  const readiness = evaluateReadiness(platform, row as unknown as Record<string, unknown>, {
    enabled: row.enabled,
  });

  const actor = auditActorFromDashboardSession(session!);

  if (readiness.missingRequiredFields.length > 0) {
    await writeAuditLog({
      ...actor,
      action: "MARKETING_PLATFORM_CONNECTION_SYNC_FAILED",
      messageAr: `طلب مزامنة فشل قبل البدء — إعدادات ناقصة (${row.name})`,
      entityType: "MarketingPlatformConnection",
      entityId: row.id,
      metadata: redactSecretsFromMetadata({
        connectionId: row.id,
        platform: row.platform,
        category: row.category,
        outcome: "missing_config",
        missingRequiredFields: readiness.missingRequiredFields,
        completionPercent: readiness.completionPercent,
      }),
      stream: "TEAM",
    });
    return NextResponse.json({
      ok: false,
      status: "missing_config",
      message: readiness.nextStepMessage,
      missingRequiredFields: readiness.missingRequiredFields,
      missingOptionalFields: readiness.missingOptionalFields,
      completionPercent: readiness.completionPercent,
      guidance: readiness.guidance,
    });
  }

  // Phase 1: no live sync client yet — record the attempt + report
  // `not_implemented`. A future PlatformSyncRun table can persist the attempt.
  await writeAuditLog({
    ...actor,
    action: "MARKETING_PLATFORM_CONNECTION_SYNC_REQUESTED",
    messageAr: `طلب مزامنة منصة (placeholder): ${row.name} — لم يُفعّل العميل بعد`,
    entityType: "MarketingPlatformConnection",
    entityId: row.id,
    metadata: redactSecretsFromMetadata({
      connectionId: row.id,
      platform: row.platform,
      category: row.category,
      outcome: "not_implemented",
    }),
    stream: "TEAM",
  });

  await prisma.marketingPlatformConnection.update({
    where: { id },
    data: {
      lastSyncAt: new Date(),
      // Don't overwrite status with NOT_IMPLEMENTED if it's currently ACTIVE
      // — the connection itself is fine, only the sync client is pending.
    },
  });

  return NextResponse.json({
    ok: true,
    status: "not_implemented",
    message:
      "تم استلام طلب المزامنة. تنفيذ المزامنة الفعلي مع المنصة سيُفعَّل في مرحلة لاحقة.",
    completionPercent: readiness.completionPercent,
  });
}
