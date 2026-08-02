import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { markDeliveryStatus } from "./delivery-log-service";
import { shouldApplyDeliveryStatus } from "./delivery-status-progress";
import type { NormalizedEmailEvent } from "./providers/elastic-email/webhook-events";

/**
 * Processes normalized Elastic Email delivery events: stores each as an idempotent
 * CommunicationProviderEvent and advances the matching CommunicationDelivery. Never throws —
 * webhooks must always answer 200 so the provider does not retry a poison payload forever.
 */

export type EmailWebhookSummary = { received: number; processed: number; duplicates: number; deliveryUpdates: number; unmatched: number };

async function recordEvent(data: {
  deliveryId: string | null;
  eventType: string;
  providerMessageId: string;
  recipient: string | null;
  status: string;
  errorMessage: string | null;
  idempotencyKey: string;
  payloadSanitized: Prisma.InputJsonValue;
}): Promise<boolean> {
  try {
    await prisma.communicationProviderEvent.create({
      data: {
        deliveryId: data.deliveryId,
        channel: "EMAIL",
        provider: "ELASTIC_EMAIL",
        eventType: data.eventType,
        providerMessageId: data.providerMessageId,
        recipient: data.recipient,
        payloadSanitized: data.payloadSanitized,
        processedAt: new Date(),
        status: data.status,
        errorMessage: data.errorMessage,
        idempotencyKey: data.idempotencyKey,
      },
    });
    return true;
  } catch (error) {
    // Unique idempotencyKey violation → already processed. Any other error → swallow (never throw).
    if (typeof error === "object" && error && (error as { code?: string }).code === "P2002") return false;
    console.error("recordEmailEvent failed", error);
    return false;
  }
}

export async function processElasticEmailEvents(events: NormalizedEmailEvent[]): Promise<EmailWebhookSummary> {
  const summary: EmailWebhookSummary = { received: events.length, processed: 0, duplicates: 0, deliveryUpdates: 0, unmatched: 0 };
  if (!process.env.DATABASE_URL) return summary;

  for (const event of events) {
    const delivery = await prisma.communicationDelivery
      .findFirst({ where: { providerMessageId: event.providerMessageId }, select: { id: true, status: true } })
      .catch(() => null);

    const inserted = await recordEvent({
      deliveryId: delivery?.id ?? null,
      eventType: event.eventType,
      providerMessageId: event.providerMessageId,
      recipient: event.recipient,
      status: event.status,
      errorMessage: event.errorMessage,
      idempotencyKey: event.idempotencyKey,
      payloadSanitized: {
        kind: "status",
        status: event.status,
        recipient: event.recipient,
        occurredAt: event.occurredAt,
        error: event.errorMessage,
      },
    });
    if (!inserted) {
      summary.duplicates += 1;
      continue;
    }
    summary.processed += 1;

    if (!delivery) {
      summary.unmatched += 1;
      continue;
    }
    if (!shouldApplyDeliveryStatus(delivery.status, event.status)) continue;

    const res = await markDeliveryStatus(delivery.id, event.status, {
      providerMessageId: event.providerMessageId,
      errorMessage: event.errorMessage,
    });
    if (res.ok) summary.deliveryUpdates += 1;
  }

  return summary;
}
