import test from "node:test";
import assert from "node:assert/strict";
import { INTEGRATION_PROVIDERS, INTEGRATION_PROVIDER_DEFINITIONS, getProviderDefinition } from "../../lib/integration-settings/catalog";
import { validateIntegrationSettingValue } from "../../lib/integration-settings/validation";
import { buildElasticEmailWebhookUrl, generateWebhookToken, webhookTokenMatches } from "../../lib/integration-settings/provider-webhook";
import { buildElasticEmailPayload, readElasticEmailMessageId } from "../../lib/communication/providers/elastic-email/payload";
import { formatSenderIdentity } from "../../lib/communication/providers/elastic-email/types";
import { ELASTIC_EMAIL_REASONS, mapElasticEmailError, scrubElasticEmail } from "../../lib/communication/providers/elastic-email/errors";
import {
  extractRawEvents,
  mapElasticEmailEventStatus,
  normalizeElasticEmailEvents,
} from "../../lib/communication/providers/elastic-email/webhook-events";
import { shouldApplyDeliveryStatus } from "../../lib/communication/delivery-status-progress";

/* ───────────────────────────── catalog / architecture ───────────────────────────── */

test("Elastic Email is a registered provider and Brevo no longer carries email fields", () => {
  assert.ok((INTEGRATION_PROVIDERS as readonly string[]).includes("ELASTIC_EMAIL"));

  const elastic = getProviderDefinition("ELASTIC_EMAIL");
  const keys = elastic.fields.map((field) => field.key);
  assert.deepEqual(keys, ["API_KEY", "SENDER_NAME", "SENDER_EMAIL", "WEBHOOK_SECRET"]);
  assert.deepEqual(elastic.fields.filter((field) => field.required).map((field) => field.key), ["API_KEY", "SENDER_EMAIL"]);
  assert.equal(elastic.fields.find((field) => field.key === "API_KEY")?.secret, true);
  assert.equal(elastic.fields.find((field) => field.key === "SENDER_EMAIL")?.secret, false);

  const brevoKeys = getProviderDefinition("BREVO").fields.map((field) => field.key);
  assert.deepEqual(brevoKeys, ["API_KEY", "SMS_SENDER", "WEBHOOK_SECRET"]);
  assert.equal(brevoKeys.some((key) => key.includes("EMAIL")), false);
});

test("every provider field maps to a unique environment key", () => {
  const envKeys = Object.values(INTEGRATION_PROVIDER_DEFINITIONS).flatMap((definition) => definition.fields.map((field) => field.envKey));
  assert.equal(new Set(envKeys).size, envKeys.length, `duplicate env keys: ${envKeys.join(", ")}`);
  for (const field of getProviderDefinition("ELASTIC_EMAIL").fields) {
    assert.match(field.envKey, /^ELASTIC_EMAIL_/);
  }
});

test("Elastic Email field validation rejects bad values", () => {
  assert.equal(validateIntegrationSettingValue("ELASTIC_EMAIL", "SENDER_EMAIL", " noreply@example.org "), "noreply@example.org");
  assert.throws(() => validateIntegrationSettingValue("ELASTIC_EMAIL", "SENDER_EMAIL", "not-an-email"));
  assert.throws(() => validateIntegrationSettingValue("ELASTIC_EMAIL", "API_KEY", "short"));
  assert.throws(() => validateIntegrationSettingValue("ELASTIC_EMAIL", "UNKNOWN_KEY", "x"));
});

/* ───────────────────────────── send payload ───────────────────────────── */

test("transactional payload matches the Elastic Email v4 contract", () => {
  const payload = buildElasticEmailPayload(
    { to: "donor@example.org", subject: "شكرًا لتبرعك", html: "<p>شكرًا</p>", text: "شكرًا" },
    { email: "noreply@gozbebekleri.org.tr", name: "Gözbebekleri" }
  ) as {
    Recipients: { To: string[] };
    Content: { From: string; Subject: string; Body: { ContentType: string; Content: string; Charset: string }[] };
    Options: Record<string, unknown>;
  };

  assert.deepEqual(payload.Recipients.To, ["donor@example.org"]);
  assert.equal(payload.Content.From, "Gözbebekleri <noreply@gozbebekleri.org.tr>");
  assert.equal(payload.Content.Subject, "شكرًا لتبرعك");
  assert.deepEqual(payload.Content.Body.map((part) => part.ContentType), ["HTML", "PlainText"]);
  assert.equal(payload.Content.Body[0].Charset, "utf-8");
  assert.equal(payload.Options.TrackOpens, true);
});

test("payload omits the plain-text part when none is rendered", () => {
  const payload = buildElasticEmailPayload({ to: "a@b.org", subject: "s", html: "<p>x</p>" }, { email: "from@b.org", name: "" }) as {
    Content: { From: string; Body: unknown[] };
  };
  assert.equal(payload.Content.Body.length, 1);
  assert.equal(payload.Content.From, "from@b.org");
});

test("sender identity quotes display names that would break the From header", () => {
  assert.equal(formatSenderIdentity("a@b.org", null), "a@b.org");
  assert.equal(formatSenderIdentity("a@b.org", "Gözbebekleri"), "Gözbebekleri <a@b.org>");
  assert.equal(formatSenderIdentity("a@b.org", "Charity, Inc <spoof@evil.org>"), '"Charity, Inc <spoof@evil.org>" <a@b.org>');
  assert.equal(formatSenderIdentity("a@b.org", "Line\nBreak"), "Line Break <a@b.org>");
});

test("provider message id is read across response casings", () => {
  assert.equal(readElasticEmailMessageId({ MessageID: "msg-1" }), "msg-1");
  assert.equal(readElasticEmailMessageId({ messageId: "msg-2" }), "msg-2");
  assert.equal(readElasticEmailMessageId({ TransactionID: "tx-3" }), "tx-3");
  assert.equal(readElasticEmailMessageId({}), null);
  assert.equal(readElasticEmailMessageId("plain text"), null);
});

/* ───────────────────────────── errors ───────────────────────────── */

test("HTTP failures map to safe reason codes", () => {
  assert.equal(mapElasticEmailError(401, { Error: "bad key" }).reason, ELASTIC_EMAIL_REASONS.UNAUTHORIZED);
  assert.equal(mapElasticEmailError(403, {}).reason, ELASTIC_EMAIL_REASONS.UNAUTHORIZED);
  assert.equal(mapElasticEmailError(429, {}).reason, ELASTIC_EMAIL_REASONS.RATE_LIMITED);
  assert.equal(mapElasticEmailError(400, { Error: "unverified sender" }).reason, ELASTIC_EMAIL_REASONS.REJECTED);
  assert.equal(mapElasticEmailError(503, {}).reason, ELASTIC_EMAIL_REASONS.REQUEST_FAILED);
  assert.match(mapElasticEmailError(400, { Error: "unverified sender" }).detail, /unverified sender/);
});

test("api keys never survive scrubbing", () => {
  const key = "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0";
  assert.equal(scrubElasticEmail(`failed with x-elasticemail-apikey: ${key}`).includes(key), false);
  assert.equal(scrubElasticEmail(`Error 401 for ${key}`).includes(key), false);
  assert.ok(scrubElasticEmail("x".repeat(1000)).length <= 300);
});

test("a provider body that echoes the live key is redacted in the stored detail", () => {
  // Elastic Email returns the submitted key inside some 401 bodies. A short/odd-shaped key would
  // not match the generic heuristics, so the live value must be redacted explicitly.
  const liveKey = "elastic-key-abcdef0123456789";
  const { detail } = mapElasticEmailError(401, { Error: `Invalid api key ${liveKey}` }, liveKey);
  assert.equal(detail.includes(liveKey), false, detail);
  assert.match(detail, /401/);

  // Still scrubbed when the caller does not hand over the key, via the shape heuristics.
  const longKey = "B7f2K9xQ1mW4zR8tY6uL3nH5jP0sD2gV";
  assert.equal(scrubElasticEmail(`401: rejected ${longKey}`).includes(longKey), false);
});

/* ───────────────────────────── webhook normalization ───────────────────────────── */

test("event names map to delivery statuses regardless of casing or separators", () => {
  assert.equal(mapElasticEmailEventStatus("Sent"), "SENT");
  assert.equal(mapElasticEmailEventStatus("delivered"), "DELIVERED");
  assert.equal(mapElasticEmailEventStatus("Opened"), "OPENED");
  assert.equal(mapElasticEmailEventStatus("Clicked"), "CLICKED");
  assert.equal(mapElasticEmailEventStatus("AbuseReport"), "FAILED");
  assert.equal(mapElasticEmailEventStatus("hard_bounce"), "BOUNCED");
  assert.equal(mapElasticEmailEventStatus("Unsubscribed"), "UNSUBSCRIBED");
  assert.equal(mapElasticEmailEventStatus("something-else"), null);
  assert.equal(mapElasticEmailEventStatus(null), null);
});

test("payload unwrapping handles single objects, arrays, and wrapped collections", () => {
  assert.equal(extractRawEvents({ messageid: "a", eventtype: "Sent" }).length, 1);
  assert.equal(extractRawEvents([{ messageid: "a" }, { messageid: "b" }]).length, 2);
  assert.equal(extractRawEvents({ Events: [{ messageid: "a" }] }).length, 1);
  assert.equal(extractRawEvents(null).length, 0);
  assert.equal(extractRawEvents("nope").length, 0);
});

test("events normalize across Elastic Email field-name generations", () => {
  const events = normalizeElasticEmailEvents([
    { messageid: "m1", eventtype: "Delivered", to: "a@b.org", date: "2026-08-01T10:00:00Z" },
    { MessageID: "m2", EventType: "Opened", email: "c@d.org" },
    { msgid: "m3", status: "Error", to: "e@f.org", error: "mailbox full" },
  ]);

  assert.equal(events.length, 3);
  assert.deepEqual(events.map((event) => event.status), ["DELIVERED", "OPENED", "FAILED"]);
  assert.deepEqual(events.map((event) => event.providerMessageId), ["m1", "m2", "m3"]);
  assert.deepEqual(events.map((event) => event.recipient), ["a@b.org", "c@d.org", "e@f.org"]);
  assert.equal(events[2].errorMessage, "mailbox full");
  // Errors carry the reason; successes must not invent one.
  assert.equal(events[0].errorMessage, null);
});

test("unusable events are dropped rather than guessed", () => {
  assert.deepEqual(normalizeElasticEmailEvents([{ eventtype: "Delivered" }]), []); // no message id
  assert.deepEqual(normalizeElasticEmailEvents([{ messageid: "m1" }]), []); // no event type
  assert.deepEqual(normalizeElasticEmailEvents([{ messageid: "m1", eventtype: "Queued" }]), []); // unmapped event
});

test("idempotency keys separate distinct events and repeat for identical ones", () => {
  const [first] = normalizeElasticEmailEvents([{ messageid: "m1", eventtype: "Opened", date: "2026-08-01T10:00:00Z" }]);
  const [again] = normalizeElasticEmailEvents([{ messageid: "m1", eventtype: "Opened", date: "2026-08-01T10:00:00Z" }]);
  const [clicked] = normalizeElasticEmailEvents([{ messageid: "m1", eventtype: "Clicked", date: "2026-08-01T10:00:00Z" }]);
  assert.equal(first.idempotencyKey, again.idempotencyKey);
  assert.notEqual(first.idempotencyKey, clicked.idempotencyKey);
});

/* ───────────────────────────── status ladder ───────────────────────────── */

test("engagement statuses only move forward but terminal outcomes always apply", () => {
  assert.equal(shouldApplyDeliveryStatus("SENT", "DELIVERED"), true);
  assert.equal(shouldApplyDeliveryStatus("DELIVERED", "OPENED"), true);
  assert.equal(shouldApplyDeliveryStatus("OPENED", "CLICKED"), true);
  // Out-of-order webhooks must not downgrade progress.
  assert.equal(shouldApplyDeliveryStatus("CLICKED", "DELIVERED"), false);
  assert.equal(shouldApplyDeliveryStatus("OPENED", "SENT"), false);
  assert.equal(shouldApplyDeliveryStatus("DELIVERED", "DELIVERED"), false);
  // Failures are the final word whenever they arrive.
  assert.equal(shouldApplyDeliveryStatus("CLICKED", "BOUNCED"), true);
  assert.equal(shouldApplyDeliveryStatus("DELIVERED", "UNSUBSCRIBED"), true);
  assert.equal(shouldApplyDeliveryStatus("FAILED", "FAILED"), false);
  assert.equal(shouldApplyDeliveryStatus(null, "DELIVERED"), true);
  // Shared with the Brevo SMS webhook: a replayed `sent` after delivery is ignored there too.
  assert.equal(shouldApplyDeliveryStatus("DELIVERED", "SENT"), false);
});

/* ───────────────────────────── webhook token ───────────────────────────── */

test("Elastic Email webhook token is server-generated and embedded once", () => {
  const token = generateWebhookToken();
  assert.ok(token.length >= 43);
  assert.notEqual(token, generateWebhookToken());
  const url = buildElasticEmailWebhookUrl(token, { NODE_ENV: "test", NEXTAUTH_URL: "https://example.org" } as NodeJS.ProcessEnv);
  assert.equal(url, `https://example.org/api/webhooks/elastic-email?token=${encodeURIComponent(token)}`);
  assert.equal((url.match(/token=/g) ?? []).length, 1);
});

test("webhook token comparison rejects wrong and truncated tokens", () => {
  const token = generateWebhookToken();
  assert.equal(webhookTokenMatches(token, token), true);
  assert.equal(webhookTokenMatches(token.slice(0, -1), token), false);
  assert.equal(webhookTokenMatches("", token), false);
  assert.equal(webhookTokenMatches(null, token), false);
});
