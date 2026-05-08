import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1).max(4096),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "templates");
  if (denied) return denied;

  const templates = await prisma.whatsappTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      body: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "templates");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const actor = auditActorFromDashboardSession(session!);
  const created = await prisma.whatsappTemplate.create({
    data: {
      name: parsed.data.name,
      body: parsed.data.body,
      createdById: actor.actorId,
    },
  });
  await writeAuditLog({
    ...actor,
    action: "WHATSAPP_TEMPLATE_CREATE",
    messageAr: `أنشأ قالب واتساب: ${created.name}`,
    entityType: "WhatsappTemplate",
    entityId: created.id,
    stream: "TEAM",
  });
  return NextResponse.json({ template: created });
}
