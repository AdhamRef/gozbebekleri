import { prisma } from "@/lib/prisma";
import {
  loadContext,
  loadContextForDonation,
  mergeText,
  type TemplateContext,
} from "@/lib/templates/variables";
import { renderEmailHtml, renderEmailSubject } from "@/lib/templates/render";
import { sendBulkEmail } from "@/lib/email";
import { sendBulkWhatsapp } from "@/lib/whatsapp";
import { writeAuditLog } from "@/lib/audit-log";
import type { TReaderDocument } from "@usewaypoint/email-builder";

/** Keep in sync with prisma `enum MessageTriggerEvent`. */
export type MessageTriggerEvent =
  | "DONATION_PAID"
  | "DONATION_FAILED"
  | "FIRST_DONATION"
  | "USER_REGISTERED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_PAYMENT"
  | "SUBSCRIPTION_CANCELLED";

export interface EventDispatchInput {
  /** REQUIRED for all events except those that don't relate to a user. */
  userId?: string;
  /** REQUIRED when the event is donation-related; gives templates the donation context. */
  donationId?: string;
}

interface DispatchResult {
  triggers: number;
  emailsSent: number;
  whatsappSent: number;
  errors: number;
}

/**
 * Best-effort fan-out — never throws to callers. If a template referenced by a
 * trigger has been deleted or fails to render, that trigger is skipped and an
 * audit log row is written. The caller's transaction is unaffected.
 */
export async function dispatchEvent(
  event: MessageTriggerEvent,
  input: EventDispatchInput
): Promise<DispatchResult> {
  const result: DispatchResult = { triggers: 0, emailsSent: 0, whatsappSent: 0, errors: 0 };

  try {
    const triggers = await prisma.messageTrigger.findMany({
      where: { event, enabled: true },
    });
    result.triggers = triggers.length;
    if (triggers.length === 0) return result;

    let ctx: TemplateContext | null = null;
    if (input.donationId) {
      ctx = await loadContextForDonation(input.donationId);
    } else if (input.userId) {
      ctx = await loadContext(input.userId);
    }
    if (!ctx) {
      await writeAuditLog({
        actorRole: "SYSTEM",
        action: "EVENT_DISPATCH_NO_CONTEXT",
        messageAr: `تعذّر تحميل سياق الحدث ${event}`,
        metadata: { event, ...input },
        stream: "TEAM",
      });
      return result;
    }

    for (const trigger of triggers) {
      try {
        if (trigger.channel === "EMAIL") {
          const tpl = await prisma.emailTemplate.findUnique({ where: { id: trigger.templateId } });
          if (!tpl) continue;
          if (!ctx.user.email) continue;
          const html = await renderEmailHtml(tpl.document as unknown as TReaderDocument, ctx);
          const subject = renderEmailSubject(tpl.subject, ctx);
          const r = await sendBulkEmail([{ to: ctx.user.email, subject, html }]);
          result.emailsSent += r.sent;
          if (r.failed.length > 0) result.errors += r.failed.length;
        } else if (trigger.channel === "WHATSAPP") {
          const tpl = await prisma.whatsappTemplate.findUnique({ where: { id: trigger.templateId } });
          if (!tpl) continue;
          if (!ctx.user.phone) continue;
          const body = mergeText(tpl.body, ctx);
          const r = await sendBulkWhatsapp([{ to: ctx.user.phone, body }]);
          result.whatsappSent += r.sent;
          if (r.failed.length > 0) result.errors += r.failed.length;
        }
      } catch (err) {
        result.errors += 1;
        console.error(`dispatchEvent ${event} trigger ${trigger.id} failed`, err);
      }
    }

    await writeAuditLog({
      actorRole: "SYSTEM",
      action: "EVENT_DISPATCH",
      messageAr: `حدث تلقائي ${event} — ${result.emailsSent} بريد، ${result.whatsappSent} واتساب${result.errors ? `، ${result.errors} فشل` : ""}`,
      metadata: { event, ...input, ...result },
      stream: "TEAM",
    });
  } catch (err) {
    console.error(`dispatchEvent ${event} top-level failure`, err);
  }

  return result;
}

/** Special handler — pass donationId; if it's the donor's first PAID donation we also fire FIRST_DONATION. */
export async function dispatchDonationPaid(donationId: string): Promise<void> {
  await dispatchEvent("DONATION_PAID", { donationId });
  try {
    const d = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { donorId: true },
    });
    if (!d) return;
    const paidCount = await prisma.donation.count({
      where: { donorId: d.donorId, status: "PAID" },
    });
    if (paidCount === 1) {
      await dispatchEvent("FIRST_DONATION", { donationId });
    }
  } catch (err) {
    console.error("dispatchDonationPaid first-donation check failed", err);
  }
}
