import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { resolveDonorIds } from "@/lib/users/donor-filter";
import { loadContextsForUserIds, mergeText } from "@/lib/templates/variables";
import { sendBulkWhatsapp, type WhatsappRecipient } from "@/lib/whatsapp";

const sendSchema = z.object({
  templateId: z.string().min(1),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("user"), userId: z.string().min(1) }),
    z.object({
      kind: z.literal("filtered"),
      filters: z.object({
        search: z.string().optional(),
        preferredLang: z.string().optional(),
        badgeId: z.string().optional(),
      }),
    }),
  ]),
});

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
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { templateId, target } = parsed.data;

  const template = await prisma.whatsappTemplate.findUnique({ where: { id: templateId } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let userIds: string[] = [];
  if (target.kind === "user") {
    userIds = [target.userId];
  } else {
    userIds = await resolveDonorIds(target.filters);
  }

  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, failed: [], skipped: 0, total: 0 });
  }

  const contexts = await loadContextsForUserIds(userIds);

  const recipients: WhatsappRecipient[] = [];
  let skipped = 0;
  for (const id of userIds) {
    const ctx = contexts.get(id);
    if (!ctx || !ctx.user.phone) {
      skipped += 1;
      continue;
    }
    recipients.push({
      to: ctx.user.phone,
      body: mergeText(template.body, ctx),
    });
  }

  const result = await sendBulkWhatsapp(recipients);

  const actor = auditActorFromDashboardSession(session!);
  await writeAuditLog({
    ...actor,
    action: "WHATSAPP_TEMPLATE_SEND",
    messageAr: `أرسل قالب واتساب «${template.name}» — نجح ${result.sent} / تخطّي ${skipped} / فشل ${result.failed.length}`,
    entityType: "WhatsappTemplate",
    entityId: template.id,
    metadata: {
      target: target.kind,
      total: userIds.length,
      sent: result.sent,
      skipped,
      failed: result.failed.length,
    },
    stream: "TEAM",
  });

  return NextResponse.json({
    total: userIds.length,
    sent: result.sent,
    skipped,
    failed: result.failed,
  });
}
