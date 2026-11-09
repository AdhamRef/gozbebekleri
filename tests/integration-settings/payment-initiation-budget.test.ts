import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const guarded = ["intent", "charge", "checkout", "subscribe", "fallback"];
test("all interactive Stripe initiation routes enforce abuse budget", () => {
  for (const name of guarded) {
    const source = readFileSync("app/api/stripe/" + name + "/route.ts", "utf8");
    assert.match(source, /enforcePaymentInitiationBudget\(/, name + " missing guard");
    assert.ok(source.indexOf("enforcePaymentInitiationBudget(") < source.indexOf("stripe.paymentIntents.create(") || !source.includes("stripe.paymentIntents.create("));
  }
});
test("Stripe webhook is never throttled as a browser initiation", () => {
  const source = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  assert.doesNotMatch(source, /enforcePaymentInitiationBudget/);
});
test("initiation guard uses database atomic updates and explicit rejection", () => {
  const source = readFileSync("lib/site-security/payment-initiation-budget.ts", "utf8");
  assert.match(source, /findAndModify:/);
  assert.match(source, /\$inc: \{ attempts: 1 \}/);
  assert.match(source, /status: 429/);
  assert.match(source, /status: 503/);
});

test("card donation creation is guarded at both public intake routes", () => {
  for (const path of ["app/api/cart/payment/route.ts", "app/api/donations/route.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /enforceDonationIntakeBudget\(request\)/);
    assert.ok(source.indexOf("enforceDonationIntakeBudget(request)") < source.indexOf("resolveGuestDonor("));
  }
});

test("PayFor initiation and anonymous donation retry cannot bypass payment budget", () => {
  for (const path of ["app/api/payfor/3dpay/initiate/route.ts", "app/api/donations/[id]/retry/route.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /enforcePaymentInitiationBudget\(/);
  }
});
test("payment budgets are disabled by default and use keyed actor identifiers", () => {
  const source = readFileSync("lib/site-security/payment-initiation-budget.ts", "utf8");
  assert.match(source, /DONATION_ABUSE_GUARD_ENABLED !== "true"/);
  assert.match(source, /createHmac\("sha256"/);
});
