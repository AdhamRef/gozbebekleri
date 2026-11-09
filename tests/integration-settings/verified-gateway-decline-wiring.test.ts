import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = (path: string) => readFileSync(path, "utf8");
test("signed Stripe failure handler invokes verified card-decline adapter", () => {
  const webhook = src("app/api/stripe/webhook/route.ts");
  const adapter = src("lib/site-security/stripe-verified-decline.ts");
  assert.match(webhook, /stripe\.webhooks\.constructEvent\(/);
  assert.match(webhook, /recordSignedStripeCardDecline\(intent, event\.id, donation\)/);
  assert.match(webhook, /case "payment_intent\.payment_failed":/);
  assert.match(webhook, /invoice\) break/);
  assert.match(adapter, /error\?\.type !== "card_error"/);
  assert.match(adapter, /DONATION_ABUSE_GUARD_ENABLED !== "true"/);
  assert.match(adapter, /recordVerifiedDonationFailure\(/);
  assert.doesNotMatch(adapter, /PENDING|PROVIDER_ERROR/);
});
test("bank-origin redirects without authenticated response must not increment fraud counter", () => {
  const failCallback = src("app/api/payfor/3dpay/fail/route.ts");
  assert.doesNotMatch(failCallback, /recordVerifiedDonationFailure|recordConfirmedAlbarakaSaleDecline/);
});

test("deferred Stripe refund callback is accepted by charge settlement without breaking legacy callers", () => {
  const webhook = src("app/api/stripe/webhook/route.ts");
  const settlement = src("lib/donations/stripe-refund-settlement.ts");
  assert.match(webhook, /refundId => reconcileOrDeferStripeRefund\(prisma, stripe, refundId\)/);
  assert.match(settlement, /reconcileRefund: \(refundId: string\) => Promise<string>/);
  assert.match(settlement, /results\.push\(await reconcileRefund\(item\.id\)\)/);
});
