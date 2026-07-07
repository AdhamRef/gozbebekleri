import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getSender } from "@/lib/communication/sender-service";
import { createDeliveryRecord, markDeliveryStatus } from "@/lib/communication/delivery-log-service";
import { sendTemplateMessage } from "@/lib/communication/providers/meta-whatsapp/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send ONE approved WhatsApp template to a single test recipient. Requires { confirm: true }.
 * Archives a CommunicationDelivery (origin TEST) BEFORE sending. Marks SENT only if Meta accepted
 * (stores the wamid); missing config / provider failure → SKIPPED / FAILED with a safe reason.
 * No bulk recipients, no free text, approved template only. The recipient is NOT saved as a donor.
 */
export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirm !== true) return NextResponse.json({ error: "confirmation required" }, { status: 400, headers: operationsNoStoreHeaders });

  const senderId = typeof body.senderId === "string" ? body.senderId : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
  const languageCode = typeof body.languageCode === "string" ? body.languageCode.trim() : "ar";
  if (!senderId || !to || !templateName) return NextResponse.json({ error: "senderId, to and templateName are required" }, { status: 400, headers: operationsNoStoreHeaders });

  const sender = await getSender(senderId);
  if (!sender?.phoneNumberId) return NextResponse.json({ error: "META_WHATSAPP_SENDER_MISSING_PHONE_NUMBER_ID" }, { status: 400, headers: operationsNoStoreHeaders });

  const actor = auditActorFromDashboardSession(session!);

  // Archive first (recipientUserId stays null — a test recipient is never attached to a donor).
  const created = await createDeliveryRecord({
    channel: "WHATSAPP",
    provider: "META_WHATSAPP",
    senderId,
    templateName,
    recipientPhone: to,
    locale: languageCode,
    purpose: "UTILITY",
    origin: "TEST",
    renderedBody: `[قالب اختبار: ${templateName}]`,
    createdBy: actor.actorId,
    status: "RENDERED",
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status, headers: operationsNoStoreHeaders });
  const deliveryId = created.data.id;

  const result = await sendTemplateMessage({ phoneNumberId: sender.phoneNumberId, to, templateName, languageCode });
  if (!result.ok) {
    const terminal = result.reason.endsWith("_NOT_CONFIGURED") || result.reason.includes("SENDER_MISSING");
    await markDeliveryStatus(deliveryId, terminal ? "SKIPPED" : "FAILED", { errorMessage: result.reason });
    return NextResponse.json({ status: terminal ? "SKIPPED" : "FAILED", reason: result.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }

  await markDeliveryStatus(deliveryId, "SENT", { providerMessageId: result.providerMessageId });
  return NextResponse.json({ status: "SENT", providerMessageId: result.providerMessageId, deliveryId }, { headers: operationsNoStoreHeaders });
}
