import assert from "node:assert/strict";
import test from "node:test";
import { archivedTriggerAttempt } from "../../lib/events/dispatch-recovery";

test("recovery does not resend accepted, failed or uncertain archived attempts", () => {
  for (const status of ["SENT", "DELIVERED", "READ", "FAILED", "RENDERED", "SKIPPED"]) {
    assert.equal(archivedTriggerAttempt([{ status, providerMessageId: null, variables: { trigger: { event: "DONATION_PAID", donationId: "a" } } }], "DONATION_PAID", "a"), "ALREADY_ATTEMPTED");
  }
});

test("another donation or event never suppresses an unattempted notification", () => {
  const rows = [{ status: "SENT", providerMessageId: "provider", variables: { trigger: { event: "DONATION_PAID", donationId: "a" } } }];
  assert.equal(archivedTriggerAttempt(rows, "DONATION_PAID", "b"), null);
  assert.equal(archivedTriggerAttempt(rows, "FIRST_DONATION", "a"), null);
  assert.equal(archivedTriggerAttempt([{ ...rows[0], variables: null }], "DONATION_PAID", "a"), null);
});
