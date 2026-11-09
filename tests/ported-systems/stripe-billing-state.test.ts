import test from "node:test";
import assert from "node:assert/strict";
import { stripeBillingState } from "../../lib/donations/stripe-subscription-billing";

test("Stripe subscription period end overrides paid-at date and prevents monthly drift", () => {
  const date = stripeBillingState({status:"active",items:{data:[{current_period_end:1796198400}]}});
  assert.equal(date.status, "ACTIVE");
  assert.equal(date.nextBillingDate?.toISOString(), new Date(1796198400000).toISOString());
});

test("failed, paused, canceled Stripe subscriptions cannot be reactivated by a paid invoice", () => {
  assert.equal(stripeBillingState({status:"canceled"}).status, "CANCELLED");
  assert.equal(stripeBillingState({status:"paused"}).status, "PAUSED");
  assert.equal(stripeBillingState({status:"past_due"}).status, "PAYMENT_FAILED");
  assert.equal(stripeBillingState({status:"unpaid"}).status, "PAYMENT_FAILED");
  assert.equal(stripeBillingState({status:"incomplete"}).status, "PAYMENT_FAILED");
});

test("unknown provider status and absent next period never fabricate a schedule", () => {
  const result = stripeBillingState({status:"unknown"});
  assert.equal(result.status, null);
  assert.equal(result.nextBillingDate,null);
});
