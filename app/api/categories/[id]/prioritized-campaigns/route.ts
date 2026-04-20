import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";

// GET /api/categories/[id]/prioritized-campaigns
// Returns campaigns in this category that have a categoryPriority set, ordered asc.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        categoryId: id,
        categoryPriority: { not: null },
      },
      orderBy: { categoryPriority: "asc" },
      select: {
        id: true,
        title: true,
        categoryPriority: true,
        isActive: true,
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching prioritized campaigns for category:", error);
    return NextResponse.json(
      { error: "Failed to fetch prioritized campaigns" },
      { status: 500 }
    );
  }
}

// POST /api/categories/[id]/prioritized-campaigns
// Body: { campaigns: [{ id: string, order: number }] }
// Clears categoryPriority for all campaigns in the category, then sets it for the provided list.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { campaigns } = body as { campaigns: { id: string; order: number }[] };

    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await prisma.$transaction([
      // Clear existing priorities in this category
      prisma.campaign.updateMany({
        where: { categoryId: id, categoryPriority: { not: null } },
        data: { categoryPriority: null },
      }),
      // Apply new priorities
      ...campaigns.map(({ id: campaignId, order }) =>
        prisma.campaign.update({
          where: { id: campaignId },
          data: { categoryPriority: order },
        })
      ),
    ]);

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "CAMPAIGN_CATEGORY_REORDER",
      messageAr: `${actor.actorName ?? "مسؤول"} أعاد ترتيب أولويات الحملات داخل قسم (${campaigns.length} حملة)`,
      entityType: "Category",
      entityId: id,
      metadata: { count: campaigns.length, categoryId: id },
    });

    return NextResponse.json({ message: "Reordered successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error reordering category campaigns:", error);
    return NextResponse.json(
      { error: "Failed to reorder category campaigns" },
      { status: 500 }
    );
  }
}
