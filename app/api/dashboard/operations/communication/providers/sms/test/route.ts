import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createDeliveryRecord, markDeliveryStatus } from "@/lib/communication/delivery-log-service";
import { resolveSmsProvider, sendSmsMessage } from "@/lib/communication/providers/sms/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send ONE test SMS to a single recipient. Requires { confirm: true }. The provider is chosen by the
 * recipient number: Turkish (+90) → Netgsm, otherwise → Brevo. Archives a CommunicationDelivery
 * (origin TEST) BEFORE sending; SENT only on real provider acceptance; missing config → SKIPPED with
 * the exact reason. No Twilio, no bulk. The recipient is NOT saved as a donor.
 */
export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirm !== true) return NextResponse.json({ error: "confirmation required" }, { status: 400, headers: operationsNoStoreHeaders });

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "رسالة اختبار من مركز التواصل.";
  const type = body.type === "marketing" ? "marketing" : "transactional";
  if (!to) return NextResponse.json({ error: "recipient phone required" }, { status: 400, headers: operationsNoStoreHeaders });

  const route = resolveSmsProvider(null, to);
  const actor = auditActorFromDashboardSession(session!);

  const created = await createDeliveryRecord({
    channel: "SMS",
    provider: route.provider,
    recipientPhone: to,
    locale: "ar",
    purpose: type === "marketing" ? "MARKETING" : "UTILITY",
    origin: "TEST",
    renderedBody: message,
    createdBy: actor.actorId,
    status: "RENDERED",
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status, headers: operationsNoStoreHeaders });
  const deliveryId = created.data.id;

  // Missing config → SKIPPED with the exact reason (never sent, never SENT).
  if (!route.configured) {
    await markDeliveryStatus(deliveryId, "SKIPPED", { errorMessage: route.reason });
    return NextResponse.json({ status: "SKIPPED", provider: route.provider, reason: route.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }

  const result = await sendSmsMessage({ to, content: message, type, tag: "test" });
  if (!result.ok) {
    const terminal = result.reason.endsWith("_NOT_CONFIGURED");
    await markDeliveryStatus(deliveryId, terminal ? "SKIPPED" : "FAILED", { errorMessage: result.reason });
    return NextResponse.json({ status: terminal ? "SKIPPED" : "FAILED", provider: result.provider, reason: result.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }

  await markDeliveryStatus(deliveryId, "SENT", { providerMessageId: result.providerMessageId, internalAccepted: result.internalAccepted });
  return NextResponse.json({ status: "SENT", provider: result.provider, providerMessageId: result.providerMessageId, deliveryId }, { headers: operationsNoStoreHeaders });
}
