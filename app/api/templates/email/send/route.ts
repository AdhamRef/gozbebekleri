import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { resolveDonorIds } from "@/lib/users/donor-filter";
import { loadContextsForUserIds } from "@/lib/templates/variables";
import { renderEmailHtml, renderEmailSubject } from "@/lib/templates/render";
import { sendBulkEmail, type BulkEmailRecipient } from "@/lib/email";
import { pickLocale, resolveEmailVariant } from "@/lib/templates/locale-resolver";
import type { TReaderDocument } from "@usewaypoint/email-builder";

const sendSchema = z.object({
  templateId: z.string().min(1),
  /** Optional explicit locale. Omit to use each recipient's preferredLang
   *  (with fallback to ar when the user has none). */
  locale: z.string().optional(),
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

  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
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

  const recipients: BulkEmailRecipient[] = [];
  let skipped = 0;
  for (const id of userIds) {
    const ctx = contexts.get(id);
    if (!ctx || !ctx.user.email) {
      skipped += 1;
      continue;
    }
    const locale = pickLocale({
      override: parsed.data.locale,
      recipientLang: ctx.user.preferredLang,
    });
    const variant = resolveEmailVariant(template, locale);
    recipients.push({
      to: ctx.user.email,
      subject: renderEmailSubject(variant.subject, ctx),
      html: await renderEmailHtml(variant.document as TReaderDocument, ctx),
    });
  }

  const result = await sendBulkEmail(recipients);

  const actor = auditActorFromDashboardSession(session!);
  await writeAuditLog({
    ...actor,
    action: "EMAIL_TEMPLATE_SEND",
    messageAr: `أرسل قالب بريد «${template.name}» — نجح ${result.sent} / تخطّي ${skipped} / فشل ${result.failed.length}`,
    entityType: "EmailTemplate",
    entityId: template.id,
    metadata: {
      target: target.kind,
      total: userIds.length,
      sent: result.sent,
      skipped,
      failed: result.failed.length,
      localeOverride: parsed.data.locale ?? null,
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
