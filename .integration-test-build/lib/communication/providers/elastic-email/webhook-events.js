"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapElasticEmailEventStatus = mapElasticEmailEventStatus;
exports.extractRawEvents = extractRawEvents;
exports.normalizeElasticEmailEvents = normalizeElasticEmailEvents;
const STATUS_BY_EVENT = {
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
function pick(row, keys) {
    const lookup = new Map();
    for (const [key, value] of Object.entries(row))
        lookup.set(key.toLowerCase().replace(/[_-]/g, ""), value);
    for (const key of keys) {
        const value = lookup.get(key.replace(/[_-]/g, ""));
        if (typeof value === "string" && value.trim())
            return value.trim();
        if (typeof value === "number")
            return String(value);
    }
    return null;
}
function mapElasticEmailEventStatus(event) {
    if (!event)
        return null;
    return STATUS_BY_EVENT[event.toLowerCase().replace(/[\s_-]/g, "")] ?? null;
}
/** Unwrap the payload into a flat list of raw event objects (single object, array, or `{Events:[…]}`). */
function extractRawEvents(payload) {
    if (Array.isArray(payload))
        return payload.filter((item) => !!item && typeof item === "object");
    if (!payload || typeof payload !== "object")
        return [];
    const row = payload;
    for (const key of ["Events", "events", "Data", "data"]) {
        const nested = row[key];
        if (Array.isArray(nested))
            return nested.filter((item) => !!item && typeof item === "object");
    }
    return [row];
}
function normalizeElasticEmailEvents(payload) {
    const out = [];
    for (const raw of extractRawEvents(payload)) {
        const providerMessageId = pick(raw, MESSAGE_ID_KEYS);
        if (!providerMessageId)
            continue;
        // `status` doubles as the event name in some payloads; try every candidate before giving up.
        let eventType = null;
        let status = null;
        for (const key of EVENT_KEYS) {
            const candidate = pick(raw, [key]);
            const mapped = mapElasticEmailEventStatus(candidate);
            if (mapped) {
                eventType = candidate;
                status = mapped;
                break;
            }
            if (candidate && !eventType)
                eventType = candidate;
        }
        if (!status)
            continue;
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
