import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { queueAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";
import { writeErrorMessage } from "@/lib/dashboard/write-error-message";
import { ImpactConfigError, parseImpactCampaignBody } from "@/lib/impact/admin";
import { syncBackingCampaignTitle } from "@/lib/impact/server";
import { pickText } from "@/lib/impact/config";

type Ctx = { params: Promise<{ id: string }> };

const isObjectId = (id: string) => /^[a-f0-9]{24}$/i.test(id);

// GET /api/impact/:id — full config for the dashboard editor
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const row = await prisma.impactCampaign.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("[impact] get:", error);
    return NextResponse.json({ error: "تعذّر التحميل" }, { status: 500 });
  }
}

// PUT /api/impact/:id — full update, or `{ isActive }` alone for the list toggle
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const existing = await prisma.impactCampaign.findUnique({
      where: { id },
      select: { id: true, slug: true, campaignId: true, title: true },
    });
    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const actor = auditActorFromDashboardSession(session!);

    if (Object.keys(body).length === 1 && typeof body.isActive === "boolean") {
      await prisma.impactCampaign.update({ where: { id }, data: { isActive: body.isActive } });
      queueAuditLog({
        ...actor,
        action: "IMPACT_CAMPAIGN_TOGGLE",
        messageAr: `${actor.actorName ?? "مسؤول"} ${body.isActive ? "فعّل" : "أوقف"} حملة "اصنع أثرًا": ${pickText(existing.title, "ar")}`,
        entityType: "ImpactCampaign",
        entityId: id,
      });
      return NextResponse.json({ ok: true });
    }

    let data;
    try {
      data = parseImpactCampaignBody(body);
    } catch (e) {
      if (e instanceof ImpactConfigError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    if (data.slug !== existing.slug) {
      const taken = await prisma.impactCampaign.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (taken) return NextResponse.json({ error: "هذا الرابط مستخدم بالفعل" }, { status: 409 });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.impactCampaign.update({
          where: { id },
          data: {
            slug: data.slug,
            title: data.title,
            intro: data.intro,
            isActive: data.isActive,
            allowMonthly: data.allowMonthly,
            regions: data.regions,
            needs: data.needs,
          },
        });
        await syncBackingCampaignTitle(tx, existing.campaignId, data.title);
      },
      { timeout: 20000 }
    );

    queueAuditLog({
      ...actor,
      action: "IMPACT_CAMPAIGN_UPDATE",
      messageAr: `${actor.actorName ?? "مسؤول"} عدّل حملة "اصنع أثرًا": ${pickText(data.title, "ar")}`,
      entityType: "ImpactCampaign",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[impact] update:", error);
    return NextResponse.json({ error: writeErrorMessage(error, "تعذّر حفظ التغييرات") }, { status: 500 });
  }
}

// DELETE /api/impact/:id — only for builders that never received a donation;
// otherwise deactivate it so donation history and receipts stay intact.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const row = await prisma.impactCampaign.findUnique({
      where: { id },
      select: { campaignId: true, title: true, _count: { select: { lines: true } } },
    });
    if (!row) return NextResponse.json({ ok: true });

    const [donationItems, subscriptionItems] = await Promise.all([
      prisma.donationItem.count({ where: { campaignId: row.campaignId } }),
      prisma.subscriptionItem.count({ where: { campaignId: row.campaignId } }),
    ]);
    if (row._count.lines > 0 || donationItems > 0 || subscriptionItems > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف حملة استقبلت تبرعات — أوقفها بدلًا من ذلك" },
        { status: 409 }
      );
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.impactCampaign.delete({ where: { id } });
        await tx.campaign.delete({ where: { id: row.campaignId } });
      },
      { timeout: 20000 }
    );

    const actor = auditActorFromDashboardSession(session!);
    queueAuditLog({
      ...actor,
      action: "IMPACT_CAMPAIGN_DELETE",
      messageAr: `${actor.actorName ?? "مسؤول"} حذف حملة "اصنع أثرًا": ${pickText(row.title, "ar")}`,
      entityType: "ImpactCampaign",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[impact] delete:", error);
    return NextResponse.json({ error: writeErrorMessage(error, "تعذّر الحذف") }, { status: 500 });
  }
}
