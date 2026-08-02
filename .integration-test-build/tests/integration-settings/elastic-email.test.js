"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const catalog_1 = require("../../lib/integration-settings/catalog");
const validation_1 = require("../../lib/integration-settings/validation");
const provider_webhook_1 = require("../../lib/integration-settings/provider-webhook");
const payload_1 = require("../../lib/communication/providers/elastic-email/payload");
const types_1 = require("../../lib/communication/providers/elastic-email/types");
const errors_1 = require("../../lib/communication/providers/elastic-email/errors");
const webhook_events_1 = require("../../lib/communication/providers/elastic-email/webhook-events");
const delivery_status_progress_1 = require("../../lib/communication/delivery-status-progress");
/* ───────────────────────────── catalog / architecture ───────────────────────────── */
(0, node_test_1.default)("Elastic Email is a registered provider and Brevo no longer carries email fields", () => {
    strict_1.default.ok(catalog_1.INTEGRATION_PROVIDERS.includes("ELASTIC_EMAIL"));
    const elastic = (0, catalog_1.getProviderDefinition)("ELASTIC_EMAIL");
    const keys = elastic.fields.map((field) => field.key);
    strict_1.default.deepEqual(keys, ["API_KEY", "SENDER_NAME", "SENDER_EMAIL", "WEBHOOK_SECRET"]);
    strict_1.default.deepEqual(elastic.fields.filter((field) => field.required).map((field) => field.key), ["API_KEY", "SENDER_EMAIL"]);
    strict_1.default.equal(elastic.fields.find((field) => field.key === "API_KEY")?.secret, true);
    strict_1.default.equal(elastic.fields.find((field) => field.key === "SENDER_EMAIL")?.secret, false);
    const brevoKeys = (0, catalog_1.getProviderDefinition)("BREVO").fields.map((field) => field.key);
    strict_1.default.deepEqual(brevoKeys, ["API_KEY", "SMS_SENDER", "WEBHOOK_SECRET"]);
    strict_1.default.equal(brevoKeys.some((key) => key.includes("EMAIL")), false);
});
(0, node_test_1.default)("every provider field maps to a unique environment key", () => {
    const envKeys = Object.values(catalog_1.INTEGRATION_PROVIDER_DEFINITIONS).flatMap((definition) => definition.fields.map((field) => field.envKey));
    strict_1.default.equal(new Set(envKeys).size, envKeys.length, `duplicate env keys: ${envKeys.join(", ")}`);
    for (const field of (0, catalog_1.getProviderDefinition)("ELASTIC_EMAIL").fields) {
        strict_1.default.match(field.envKey, /^ELASTIC_EMAIL_/);
    }
});
(0, node_test_1.default)("Elastic Email field validation rejects bad values", () => {
    strict_1.default.equal((0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "SENDER_EMAIL", " noreply@example.org "), "noreply@example.org");
    strict_1.default.throws(() => (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "SENDER_EMAIL", "not-an-email"));
    strict_1.default.throws(() => (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "API_KEY", "short"));
    strict_1.default.throws(() => (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "UNKNOWN_KEY", "x"));
});
/* ───────────────────────────── send payload ───────────────────────────── */
(0, node_test_1.default)("transactional payload matches the Elastic Email v4 contract", () => {
    const payload = (0, payload_1.buildElasticEmailPayload)({ to: "donor@example.org", subject: "شكرًا لتبرعك", html: "<p>شكرًا</p>", text: "شكرًا" }, { email: "noreply@gozbebekleri.org.tr", name: "Gözbebekleri" });
    strict_1.default.deepEqual(payload.Recipients.To, ["donor@example.org"]);
    strict_1.default.equal(payload.Content.From, "Gözbebekleri <noreply@gozbebekleri.org.tr>");
    strict_1.default.equal(payload.Content.Subject, "شكرًا لتبرعك");
    strict_1.default.deepEqual(payload.Content.Body.map((part) => part.ContentType), ["HTML", "PlainText"]);
    strict_1.default.equal(payload.Content.Body[0].Charset, "utf-8");
    strict_1.default.equal(payload.Options.TrackOpens, true);
});
(0, node_test_1.default)("payload omits the plain-text part when none is rendered", () => {
    const payload = (0, payload_1.buildElasticEmailPayload)({ to: "a@b.org", subject: "s", html: "<p>x</p>" }, { email: "from@b.org", name: "" });
    strict_1.default.equal(payload.Content.Body.length, 1);
    strict_1.default.equal(payload.Content.From, "from@b.org");
});
(0, node_test_1.default)("sender identity quotes display names that would break the From header", () => {
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", null), "a@b.org");
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", "Gözbebekleri"), "Gözbebekleri <a@b.org>");
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", "Charity, Inc <spoof@evil.org>"), '"Charity, Inc <spoof@evil.org>" <a@b.org>');
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", "Line\nBreak"), "Line Break <a@b.org>");
});
(0, node_test_1.default)("provider message id is read across response casings", () => {
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({ MessageID: "msg-1" }), "msg-1");
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({ messageId: "msg-2" }), "msg-2");
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({ TransactionID: "tx-3" }), "tx-3");
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({}), null);
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)("plain text"), null);
});
/* ───────────────────────────── errors ───────────────────────────── */
(0, node_test_1.default)("HTTP failures map to safe reason codes", () => {
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(401, { Error: "bad key" }).reason, errors_1.ELASTIC_EMAIL_REASONS.UNAUTHORIZED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(403, {}).reason, errors_1.ELASTIC_EMAIL_REASONS.UNAUTHORIZED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(429, {}).reason, errors_1.ELASTIC_EMAIL_REASONS.RATE_LIMITED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(400, { Error: "unverified sender" }).reason, errors_1.ELASTIC_EMAIL_REASONS.REJECTED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(503, {}).reason, errors_1.ELASTIC_EMAIL_REASONS.REQUEST_FAILED);
    strict_1.default.match((0, errors_1.mapElasticEmailError)(400, { Error: "unverified sender" }).detail, /unverified sender/);
});
(0, node_test_1.default)("api keys never survive scrubbing", () => {
    const key = "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0";
    strict_1.default.equal((0, errors_1.scrubElasticEmail)(`failed with x-elasticemail-apikey: ${key}`).includes(key), false);
    strict_1.default.equal((0, errors_1.scrubElasticEmail)(`Error 401 for ${key}`).includes(key), false);
    strict_1.default.ok((0, errors_1.scrubElasticEmail)("x".repeat(1000)).length <= 300);
});
(0, node_test_1.default)("a provider body that echoes the live key is redacted in the stored detail", () => {
    // Elastic Email returns the submitted key inside some 401 bodies. A short/odd-shaped key would
    // not match the generic heuristics, so the live value must be redacted explicitly.
    const liveKey = "elastic-key-abcdef0123456789";
    const { detail } = (0, errors_1.mapElasticEmailError)(401, { Error: `Invalid api key ${liveKey}` }, liveKey);
    strict_1.default.equal(detail.includes(liveKey), false, detail);
    strict_1.default.match(detail, /401/);
    // Still scrubbed when the caller does not hand over the key, via the shape heuristics.
    const longKey = "B7f2K9xQ1mW4zR8tY6uL3nH5jP0sD2gV";
    strict_1.default.equal((0, errors_1.scrubElasticEmail)(`401: rejected ${longKey}`).includes(longKey), false);
});
/* ───────────────────────────── webhook normalization ───────────────────────────── */
(0, node_test_1.default)("event names map to delivery statuses regardless of casing or separators", () => {
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Sent"), "SENT");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("delivered"), "DELIVERED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Opened"), "OPENED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Clicked"), "CLICKED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("AbuseReport"), "FAILED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("hard_bounce"), "BOUNCED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Unsubscribed"), "UNSUBSCRIBED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("something-else"), null);
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)(null), null);
});
(0, node_test_1.default)("payload unwrapping handles single objects, arrays, and wrapped collections", () => {
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)({ messageid: "a", eventtype: "Sent" }).length, 1);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)([{ messageid: "a" }, { messageid: "b" }]).length, 2);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)({ Events: [{ messageid: "a" }] }).length, 1);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)(null).length, 0);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)("nope").length, 0);
});
(0, node_test_1.default)("events normalize across Elastic Email field-name generations", () => {
    const events = (0, webhook_events_1.normalizeElasticEmailEvents)([
        { messageid: "m1", eventtype: "Delivered", to: "a@b.org", date: "2026-08-01T10:00:00Z" },
        { MessageID: "m2", EventType: "Opened", email: "c@d.org" },
        { msgid: "m3", status: "Error", to: "e@f.org", error: "mailbox full" },
    ]);
    strict_1.default.equal(events.length, 3);
    strict_1.default.deepEqual(events.map((event) => event.status), ["DELIVERED", "OPENED", "FAILED"]);
    strict_1.default.deepEqual(events.map((event) => event.providerMessageId), ["m1", "m2", "m3"]);
    strict_1.default.deepEqual(events.map((event) => event.recipient), ["a@b.org", "c@d.org", "e@f.org"]);
    strict_1.default.equal(events[2].errorMessage, "mailbox full");
    // Errors carry the reason; successes must not invent one.
    strict_1.default.equal(events[0].errorMessage, null);
});
(0, node_test_1.default)("unusable events are dropped rather than guessed", () => {
    strict_1.default.deepEqual((0, webhook_events_1.normalizeElasticEmailEvents)([{ eventtype: "Delivered" }]), []); // no message id
    strict_1.default.deepEqual((0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1" }]), []); // no event type
    strict_1.default.deepEqual((0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Queued" }]), []); // unmapped event
});
(0, node_test_1.default)("idempotency keys separate distinct events and repeat for identical ones", () => {
    const [first] = (0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Opened", date: "2026-08-01T10:00:00Z" }]);
    const [again] = (0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Opened", date: "2026-08-01T10:00:00Z" }]);
    const [clicked] = (0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Clicked", date: "2026-08-01T10:00:00Z" }]);
    strict_1.default.equal(first.idempotencyKey, again.idempotencyKey);
    strict_1.default.notEqual(first.idempotencyKey, clicked.idempotencyKey);
});
/* ───────────────────────────── status ladder ───────────────────────────── */
(0, node_test_1.default)("engagement statuses only move forward but terminal outcomes always apply", () => {
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("SENT", "DELIVERED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "OPENED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("OPENED", "CLICKED"), true);
    // Out-of-order webhooks must not downgrade progress.
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("CLICKED", "DELIVERED"), false);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("OPENED", "SENT"), false);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "DELIVERED"), false);
    // Failures are the final word whenever they arrive.
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("CLICKED", "BOUNCED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "UNSUBSCRIBED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("FAILED", "FAILED"), false);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)(null, "DELIVERED"), true);
    // Shared with the Brevo SMS webhook: a replayed `sent` after delivery is ignored there too.
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "SENT"), false);
});
/* ───────────────────────────── webhook token ───────────────────────────── */
(0, node_test_1.default)("Elastic Email webhook token is server-generated and embedded once", () => {
    const token = (0, provider_webhook_1.generateWebhookToken)();
    strict_1.default.ok(token.length >= 43);
    strict_1.default.notEqual(token, (0, provider_webhook_1.generateWebhookToken)());
    const url = (0, provider_webhook_1.buildElasticEmailWebhookUrl)(token, { NODE_ENV: "test", NEXTAUTH_URL: "https://example.org" });
    strict_1.default.equal(url, `https://example.org/api/webhooks/elastic-email?token=${encodeURIComponent(token)}`);
    strict_1.default.equal((url.match(/token=/g) ?? []).length, 1);
});
(0, node_test_1.default)("webhook token comparison rejects wrong and truncated tokens", () => {
    const token = (0, provider_webhook_1.generateWebhookToken)();
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)(token, token), true);
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)(token.slice(0, -1), token), false);
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)("", token), false);
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)(null, token), false);
});
