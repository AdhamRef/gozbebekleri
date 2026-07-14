import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { createDeliveryRecord, markDeliveryStatus } from "@/lib/communication/delivery-log-service";
import { getActiveCommunicationRuntimeBundle } from "@/lib/communication/runtime-config";
import { resolveSmsProviderWithRuntime, sendSmsMessage } from "@/lib/communication/providers/sms/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirm !== true) return NextResponse.json({ error: "confirmation required" }, { status: 400, headers: operationsNoStoreHeaders });
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "رسالة اختبار من مركز التواصل.";
  const type = body.type === "marketing" ? "marketing" : "transactional";
  if (!to) return NextResponse.json({ error: "recipient phone required" }, { status: 400, headers: operationsNoStoreHeaders });

  const runtimeConfig = await getActiveCommunicationRuntimeBundle();
  const route = resolveSmsProviderWithRuntime(runtimeConfig, null, to);
  const actor = auditActorFromDashboardSession(session!);
  const created = await createDeliveryRecord({
    channel: "SMS", provider: route.provider, recipientPhone: to, locale: "ar",
    purpose: type === "marketing" ? "MARKETING" : "UTILITY", origin: "TEST",
    renderedBody: message, createdBy: actor.actorId, status: "RENDERED",
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status, headers: operationsNoStoreHeaders });
  const deliveryId = created.data.id;
  if (!route.configured) {
    await markDeliveryStatus(deliveryId, "SKIPPED", { errorMessage: route.reason });
    return NextResponse.json({ status: "SKIPPED", provider: route.provider, reason: route.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }
  const result = await sendSmsMessage({ to, content: message, type, tag: "test" }, runtimeConfig);
  if (!result.ok) {
    const terminal = result.reason.endsWith("_NOT_CONFIGURED") || result.reason === "PROVIDER_DISABLED" || result.reason === "INTEGRATION_DECRYPTION_FAILED";
    await markDeliveryStatus(deliveryId, terminal ? "SKIPPED" : "FAILED", { errorMessage: result.reason });
    return NextResponse.json({ status: terminal ? "SKIPPED" : "FAILED", provider: result.provider, reason: result.reason, deliveryId }, { headers: operationsNoStoreHeaders });
  }
  await markDeliveryStatus(deliveryId, "SENT", { providerMessageId: result.providerMessageId, internalAccepted: result.internalAccepted });
  return NextResponse.json({ status: "SENT", provider: result.provider, providerMessageId: result.providerMessageId, deliveryId }, { headers: operationsNoStoreHeaders });
}
