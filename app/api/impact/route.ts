import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { queueAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";
import { writeErrorMessage } from "@/lib/dashboard/write-error-message";
import { ImpactConfigError, parseImpactCampaignBody } from "@/lib/impact/admin";
import { createBackingCampaign } from "@/lib/impact/server";
import { pickText } from "@/lib/impact/config";

// GET /api/impact — dashboard list
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    const rows = await prisma.impactCampaign.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        isActive: true,
        allowMonthly: true,
        createdAt: true,
        campaign: { select: { id: true, currentAmount: true } },
        _count: { select: { lines: true } },
      },
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[impact] list:", error);
    return NextResponse.json({ error: "تعذّر تحميل القائمة" }, { status: 500 });
  }
}

// POST /api/impact — create builder + its hidden backing campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    let data;
    try {
      data = parseImpactCampaignBody(await request.json());
    } catch (e) {
      if (e instanceof ImpactConfigError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    const taken = await prisma.impactCampaign.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "هذا الرابط مستخدم بالفعل" }, { status: 409 });

    const created = await prisma.$transaction(
      async (tx) => {
        const backing = await createBackingCampaign(tx, data.title, data.slug);
        return tx.impactCampaign.create({
          data: {
            slug: data.slug,
            title: data.title,
            intro: data.intro,
            isActive: data.isActive,
            allowMonthly: data.allowMonthly,
            regions: data.regions,
            needs: data.needs,
            campaignId: backing.id,
          },
          select: { id: true, slug: true },
        });
      },
      { timeout: 20000 }
    );

    const actor = auditActorFromDashboardSession(session!);
    queueAuditLog({
      ...actor,
      action: "IMPACT_CAMPAIGN_CREATE",
      messageAr: `${actor.actorName ?? "مسؤول"} أنشأ حملة "اصنع أثرًا": ${pickText(data.title, "ar")}`,
      entityType: "ImpactCampaign",
      entityId: created.id,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[impact] create:", error);
    return NextResponse.json({ error: writeErrorMessage(error, "تعذّر إنشاء الحملة") }, { status: 500 });
  }
}
