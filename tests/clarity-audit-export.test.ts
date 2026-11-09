import test from "node:test";
import assert from "node:assert/strict";
import { auditClarityCsvExports } from "../lib/tracking/clarity-audit-export";

const key = "synthetic-local-audit-key-with-32-chars";

test("Clarity inventory emits only minimized session and event fields", () => {
  const inventory = auditClarityCsvExports([
    {
      csv: [
        "Session ID,Start Time,Entry URL,Device,Browser,OS,Recording URL",
        'private-session-id,2026-11-03T19:00:00Z,https://www.gozbebekleri.org/ar/campaign/private-slug?token=synthetic-token,Mobile,Chrome,Android,https://recording.invalid/private',
      ].join("\n"),
    },
    {
      csv: [
        "Session ID,Timestamp,Event Name,URL",
        "private-session-id,2026-11-03T19:00:07Z,donation_flow_started,https://www.gozbebekleri.org/ar/checkout?email=person%40example.invalid",
        "private-session-id,00:00:09,person@example.invalid,https://www.gozbebekleri.org/ar/success/private-id?t=synthetic-token",
      ].join("\n"),
    },
  ], key);

  assert.equal(inventory.sourceFiles, 2);
  assert.equal(inventory.sessionRows, 1);
  assert.equal(inventory.uniqueSessionKeys, 1);
  assert.equal(inventory.eventRows, 2);
  assert.equal(inventory.sessions[0].day, "2026-11-03");
  assert.equal(inventory.sessions[0].hourIstanbul, "22");
  assert.equal(inventory.sessions[0].route, "/ar/campaign/:id");
  assert.equal(inventory.sessions[0].device, "mobile");
  assert.equal(inventory.events[0].offsetSeconds, 7);
  assert.equal(inventory.events[0].route, "/ar/checkout");
  assert.equal(inventory.events[1].eventType, "<redacted>");
  assert.equal(inventory.events[1].offsetSeconds, 9);

  const output = JSON.stringify(inventory);
  for (const privateValue of [
    "private-session-id",
    "private-slug",
    "synthetic-token",
    "recording.invalid",
    "person@example.invalid",
    "email=",
  ]) {
    assert.equal(output.includes(privateValue), false, `output must not include ${privateValue}`);
  }
  assert.match(inventory.sessions[0].evidenceKey ?? "", /^s_[a-f0-9]{20}$/);
});

test("evidence keys are stable only under the same caller-held key", () => {
  const csv = "Session ID,Start Time\nfixture-session,2026-11-03T19:00:00Z";
  const eventsCsv = "Session ID,Timestamp,Event Name\nfixture-session,00:00:02,Quick back";
  const first = auditClarityCsvExports([{ csv }], key).sessions[0].evidenceKey;
  const sameKey = auditClarityCsvExports([{ csv }], key).sessions[0].evidenceKey;
  const otherKey = auditClarityCsvExports([{ csv }], `${key}-different`).sessions[0].evidenceKey;
  const reversedInputs = auditClarityCsvExports([
    { csv: eventsCsv },
    { csv },
  ], key);

  assert.equal(first, sameKey);
  assert.notEqual(first, otherKey);
  assert.equal(reversedInputs.events[0].day, "2026-11-03");
  assert.equal(reversedInputs.events[0].eventType, "Quick back");
});

test("CSV parser supports quoted commas and rejects malformed input", () => {
  const inventory = auditClarityCsvExports([
    { csv: 'Session ID,Start Time,Entry URL\n"fixture,session",2026-11-03T19:00:00Z,/ar/campaign/example' },
  ], key);
  assert.equal(inventory.sessionRows, 1);
  assert.equal(inventory.sessions[0].route, "/ar/campaign/:id");
  assert.throws(
    () => auditClarityCsvExports([{ csv: 'Session ID,Start Time\n"broken,2026-11-03T19:00:00Z' }], key),
    /unterminated quoted field/,
  );
});

test("short HMAC keys are rejected and missing identifiers do not get invented", () => {
  assert.throws(() => auditClarityCsvExports([], "too-short"), /at least 32 characters/);
  const inventory = auditClarityCsvExports([{ csv: "Start Time,Device\n2026-11-03T19:00:00Z,Desktop" }], key);
  assert.equal(inventory.sessionRows, 1);
  assert.equal(inventory.uniqueSessionKeys, 0);
  assert.equal(inventory.sessions[0].evidenceKey, null);
});
