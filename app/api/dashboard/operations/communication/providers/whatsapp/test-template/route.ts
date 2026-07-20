import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getSender } from "@/lib/communication/sender-service";
import { createDeliveryRecord, markDeliveryStatus } from "@/lib/communication/delivery-log-service";
import { getActiveMetaWhatsappRuntimeConfig } from "@/lib/communication/runtime-config";
import { sendTemplateMessage } from "@/lib/communication/providers/meta-whatsapp/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirm !== true) return NextResponse.json({ error: "confirmation required" }, { status: 400, headers: operationsNoStoreHeaders });
  const senderId = typeof body.senderId === "string" ? body.senderId : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
  const languageCode = typeof body.languageCode === "string" ? body.languageCode.trim() : "ar";
  if (!to || !templateName) return NextResponse.json({ error: "to and templateName are required" }, { status: 400, headers: operationsNoStoreHeaders });
  const sender = senderId ? await getSender(senderId) : null;
  const runtimeConfig = await getActiveMetaWhatsappRuntimeConfig();
  const phoneNumberId = sender?.phoneNumberId || (runtimeConfig.configured ? runtimeConfig.values.defaultPhoneNumberId : null);
  const actor = auditActorFromDashboardSession(session!);
  const created = await createDeliveryRecord({ channel: "WHATSAPP", provider: "META_WHATSAPP", senderId: sender?.id ?? null, templateName, recipientPhone: to, locale: languageCode, purpose: "UTILITY", origin: "TEST", renderedBody: `[قالب اختبار: ${templateName}]`, createdBy: actor.actorId, status: "RENDERED" });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status, headers: operationsNoStoreHeaders });
  const deliveryId = created.data.id;
  if (!phoneNumberId) {
    const reason = runtimeConfig.configured ? "META_WHATSAPP_SENDER_MISSING_PHONE_NUMBER_ID" : runtimeConfig.reason;
    await markDeliveryStatus(deliveryId, "SKIPPED", { errorMessage: reason ?? "META_WHATSAPP_NOT_CONFIGURED" });
    return NextResponse.json({ status: "SKIPPED", reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }
  const result = await sendTemplateMessage({ phoneNumberId, to, templateName, languageCode }, runtimeConfig);
  if (!result.ok) {
    const terminal = result.reason.endsWith("_NOT_CONFIGURED") || result.reason.includes("SENDER_MISSING") || result.reason === "PROVIDER_DISABLED" || result.reason === "INTEGRATION_DECRYPTION_FAILED";
    await markDeliveryStatus(deliveryId, terminal ? "SKIPPED" : "FAILED", { errorMessage: result.reason });
    return NextResponse.json({ status: terminal ? "SKIPPED" : "FAILED", reason: result.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }
  await markDeliveryStatus(deliveryId, "SENT", { providerMessageId: result.providerMessageId });
  return NextResponse.json({ status: "SENT", providerMessageId: result.providerMessageId, deliveryId }, { headers: operationsNoStoreHeaders });
}
