import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkoutPaymentCanSettle } from "../../lib/donations/stripe-checkout-settlement";

test("only paid one-time Checkout settles via checkout.session.completed", () => {
  assert.equal(checkoutPaymentCanSettle("payment", "paid"), true);
  for (const status of ["unpaid", "no_payment_required", null]) {
    assert.equal(checkoutPaymentCanSettle("payment", status), false);
  }
  for (const status of ["paid", "unpaid", "no_payment_required", null]) {
    assert.equal(checkoutPaymentCanSettle("subscription", status), false);
  }
});

test("subscription checkout only maps Stripe id; invoice owns settlement, campaign increments and events", () => {
  const code = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  const first = code.slice(code.indexOf('case "checkout.session.completed":'), code.indexOf('case "invoice.payment_succeeded":'));
  assert.match(first, /if \(isMonthly\) \{/);
  assert.match(first, /payforToken: session\.subscription as string/);
  assert.match(first, /checkoutPaymentCanSettle\(session\.mode, session\.payment_status\)/);
  assert.doesNotMatch(first, /session\.payment_status === "paid" \|\| isMonthly/);
  assert.doesNotMatch(first, /SUBSCRIPTION_CREATED/);
  const invoice = code.slice(code.indexOf('case "invoice.payment_succeeded":'),code.indexOf('case "invoice.payment_failed":'));
  assert.match(invoice, /if \(isSignupInvoice\) \{/);
  assert.match(invoice, /SUBSCRIPTION_CREATED/);
  assert.match(invoice, /SUBSCRIPTION_PAYMENT/);
});
