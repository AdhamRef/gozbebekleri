import type { DeliveryStatusId } from "../../communication-runtime-types";

/**
 * Pure normalizer for Elastic Email HTTP event notifications.
 *
 * Elastic Email posts either a single event object or an array of them, and its field casing has
 * varied across notification generations (`eventtype` / `EventType` / `event`, `messageid` /
 * `msgid` / `MessageID`, …). This module keeps that tolerance in one tested place so the route
 * handler stays trivial and can always answer 200.
 */

export type NormalizedEmailEvent = {
  providerMessageId: string;
  eventType: string;
  status: DeliveryStatusId;
  recipient: string | null;
  errorMessage: string | null;
  occurredAt: string | null;
  /** Stable key for idempotent storage: message id + event + timestamp. */
  idempotencyKey: string;
};

const STATUS_BY_EVENT: Record<string, DeliveryStatusId> = {
  sent: "SENT",
  delivered: "DELIVERED",
  opened: "OPENED",
  open: "OPENED",
  clicked: "CLICKED",
  click: "CLICKED",
  unsubscribed: "UNSUBSCRIBED",
  unsubscribe: "UNSUBSCRIBED",
  bounced: "BOUNCED",
  bounce: "BOUNCED",
  hardbounce: "BOUNCED",
  softbounce: "BOUNCED",
  error: "FAILED",
  failed: "FAILED",
  abusereport: "FAILED",
  abuse: "FAILED",
  spam: "FAILED",
  complaint: "FAILED",
  suppressed: "FAILED",
  invalid: "FAILED",
};

const MESSAGE_ID_KEYS = ["messageid", "msgid", "message_id", "transactionid", "transaction_id"];
const EVENT_KEYS = ["eventtype", "event_type", "event", "status", "category"];
const RECIPIENT_KEYS = ["to", "email", "recipient", "toemail"];
const ERROR_KEYS = ["error", "errormessage", "reason", "statusdetails", "detail"];
const DATE_KEYS = ["date", "eventdate", "timestamp", "datesent", "occurredat"];

/** Case-insensitive, underscore-insensitive field lookup over one raw event object. */
function pick(row: Record<string, unknown>, keys: readonly string[]): string | null {
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) lookup.set(key.toLowerCase().replace(/[_-]/g, ""), value);
  for (const key of keys) {
    const value = lookup.get(key.replace(/[_-]/g, ""));
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function mapElasticEmailEventStatus(event: string | null): DeliveryStatusId | null {
  if (!event) return null;
  return STATUS_BY_EVENT[event.toLowerCase().replace(/[\s_-]/g, "")] ?? null;
}

/** Unwrap the payload into a flat list of raw event objects (single object, array, or `{Events:[…]}`). */
export function extractRawEvents(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  const row = payload as Record<string, unknown>;
  for (const key of ["Events", "events", "Data", "data"]) {
    const nested = row[key];
    if (Array.isArray(nested)) return nested.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  return [row];
}

export function normalizeElasticEmailEvents(payload: unknown): NormalizedEmailEvent[] {
  const out: NormalizedEmailEvent[] = [];
  for (const raw of extractRawEvents(payload)) {
    const providerMessageId = pick(raw, MESSAGE_ID_KEYS);
    if (!providerMessageId) continue;

    // `status` doubles as the event name in some payloads; try every candidate before giving up.
    let eventType: string | null = null;
    let status: DeliveryStatusId | null = null;
    for (const key of EVENT_KEYS) {
      const candidate = pick(raw, [key]);
      const mapped = mapElasticEmailEventStatus(candidate);
      if (mapped) {
        eventType = candidate;
        status = mapped;
        break;
      }
      if (candidate && !eventType) eventType = candidate;
    }
    if (!status) continue;

    const occurredAt = pick(raw, DATE_KEYS);
    out.push({
      providerMessageId,
      eventType: (eventType ?? status).toLowerCase(),
      status,
      recipient: pick(raw, RECIPIENT_KEYS),
      errorMessage: status === "FAILED" || status === "BOUNCED" ? pick(raw, ERROR_KEYS) : null,
      occurredAt,
      idempotencyKey: `elastic:${providerMessageId}:${(eventType ?? status).toLowerCase()}:${occurredAt ?? ""}`,
    });
  }
  return out;
}
