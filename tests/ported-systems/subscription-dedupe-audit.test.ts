import test from "node:test";
import assert from "node:assert/strict";
import { auditSubscriptionDuplicates, type SubscriptionAuditRow } from "../../lib/donations/subscription-dedupe-audit";

const time = new Date("2026-11-08T22:01:09Z");
const row = (id: string, providerOrderId: string | null, paidAt: Date | null, billingReason: string | null): SubscriptionAuditRow => ({
  id, subscriptionId: "sub-db-1", providerOrderId, status: "PAID", paidAt, billingReason, createdAt:time,
});

test("read-only evidence detects duplicate invoice IDs but does not confuse subscription / invoice identifiers", () => {
  const findings = auditSubscriptionDuplicates([
    row("checkout", "sub_stripe_1", null, null),
    row("paid", "in_stripe_1", time, "subscription_create"),
    row("invoice-copy", "in_stripe_1", time, "subscription_create"),
  ]);
  assert.equal(findings.filter(f=>f.category==="SAME_STRIPE_INVOICE").length, 1);
  assert.deepEqual(findings.find(f=>f.category==="SAME_STRIPE_INVOICE")!.rowIds, ["paid", "invoice-copy"]);
  assert.equal(findings.filter(f=>f.category==="POSSIBLE_SIGNUP_SHADOW").length, 2);
});

test("no false duplicate for monthly renewals or separate subscriptions", () => {
  const findings = auditSubscriptionDuplicates([
    row("signup", "in_signup", time, "subscription_create"),
    { ...row("renewal", "in_renewal", new Date("2026-12-08T22:01:09Z"), "subscription_cycle"), createdAt:new Date("2026-12-08T22:01:09Z") },
    { ...row("other", "in_signup", time, "subscription_create"), subscriptionId: "sub-db-2" },
  ]);
  assert.equal(findings.length, 0);
});

test("first-charge shadow warning requires a settled signup and a close unconfirmed row", () => {
  assert.equal(auditSubscriptionDuplicates([
    row("signup", "in_signup", time, "subscription_create"),
    { ...row("too-old", "sub_reference", null, null), createdAt: new Date("2026-10-08T22:01:09Z") },
    row("failed", "sub_reference", null, null),
  ].map(r=>r.id==="failed"?{...r,status:"FAILED"}:r)).length,0);
});
