import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createDeliveryRecord, markDeliveryStatus } from "@/lib/communication/delivery-log-service";
import { sendEmailMessage } from "@/lib/communication/providers/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send ONE test email to a single recipient via Brevo. Requires { confirm: true }. Archives a
 * CommunicationDelivery (origin TEST) BEFORE sending. On acceptance the delivery advances to SENT with
 * Brevo's messageId (or internalAccepted when Brevo returns 2xx without an id — never a fake external
 * id). Missing config / failure → SKIPPED / FAILED. The recipient is NOT saved as a donor.
 */
export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirm !== true) return NextResponse.json({ error: "confirmation required" }, { status: 400, headers: operationsNoStoreHeaders });

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "رسالة اختبار";
  const html = typeof body.html === "string" && body.html.trim() ? body.html : typeof body.body === "string" ? body.body : "<p>هذه رسالة اختبار من مركز التواصل.</p>";
  if (!to) return NextResponse.json({ error: "recipient email required" }, { status: 400, headers: operationsNoStoreHeaders });

  const actor = auditActorFromDashboardSession(session!);

  const created = await createDeliveryRecord({
    channel: "EMAIL",
    provider: "BREVO_EMAIL",
    recipientEmail: to,
    locale: "ar",
    purpose: "UTILITY",
    origin: "TEST",
    renderedSubject: subject,
    renderedBody: html,
    createdBy: actor.actorId,
    status: "RENDERED",
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status, headers: operationsNoStoreHeaders });
  const deliveryId = created.data.id;

  const result = await sendEmailMessage({ to, subject, html });
  if (!result.ok) {
    const terminal = result.reason.endsWith("_NOT_CONFIGURED");
    await markDeliveryStatus(deliveryId, terminal ? "SKIPPED" : "FAILED", { errorMessage: result.reason });
    return NextResponse.json({ status: terminal ? "SKIPPED" : "FAILED", reason: result.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }

  await markDeliveryStatus(deliveryId, "SENT", { providerMessageId: result.providerMessageId, internalAccepted: result.internalAccepted });
  return NextResponse.json({ status: "SENT", provider: result.providerId, providerMessageId: result.providerMessageId, deliveryId }, { headers: operationsNoStoreHeaders });
}
