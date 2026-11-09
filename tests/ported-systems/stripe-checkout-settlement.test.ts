import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkoutPaymentCanSettle, stripeInvoiceSettlementDate, stripeSubscriptionOwnershipMatches } from "../../lib/donations/stripe-checkout-settlement";

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

test("out-of-order invoice can bind only a matching donor and unbound Stripe subscription", () => {
  const candidate = { donorId: "donor-A", payforToken: null };
  const metadata = { subscriptionDbId: "db-sub-A", userId: "donor-A" };
  assert.equal(stripeSubscriptionOwnershipMatches(candidate, "sub_stripe_A", metadata, "db-sub-A"), true);
  assert.equal(stripeSubscriptionOwnershipMatches({ ...candidate, payforToken: "sub_stripe_A" }, "sub_stripe_A", metadata, "db-sub-A"), true);
  assert.equal(stripeSubscriptionOwnershipMatches({ ...candidate, payforToken: "sub_stripe_B" }, "sub_stripe_A", metadata, "db-sub-A"), false);
  assert.equal(stripeSubscriptionOwnershipMatches({ ...candidate, donorId: "donor-B" }, "sub_stripe_A", metadata, "db-sub-A"), false);
  assert.equal(stripeSubscriptionOwnershipMatches(candidate, "sub_stripe_A", { ...metadata, userId: "" }, "db-sub-A"), false);
  assert.equal(stripeSubscriptionOwnershipMatches(candidate, "sub_stripe_A", metadata, "db-sub-X"), false);
  assert.equal(stripeSubscriptionOwnershipMatches(null, "sub_stripe_A", metadata, "db-sub-A"), false);
});
test("invoice fallback is read-only at Stripe and never rebinds another Stripe subscription", () => {
  const src = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  const invoice = src.slice(src.indexOf('case "invoice.payment_succeeded":'), src.indexOf('case "invoice.payment_failed":'));
  assert.match(invoice, /stripe\.subscriptions\.retrieve\(stripeSubscriptionId\)/);
  assert.match(invoice, /stripeSubscriptionOwnershipMatches\(/);
  assert.match(invoice, /candidate\.payforToken/);
});

test("Stripe paid_at, not invoice creation time, determines the revenue period", () => {
  const invoiceCreated = Date.parse("2026-10-31T20:00:00Z") / 1000;
  const paid = Date.parse("2026-11-01T05:10:00Z") / 1000;
  const event = Date.parse("2026-11-01T05:10:01Z") / 1000;
  assert.equal(stripeInvoiceSettlementDate(paid, event).toISOString(), "2026-11-01T05:10:00.000Z");
  assert.equal(stripeInvoiceSettlementDate(null, event).toISOString(), "2026-11-01T05:10:01.000Z");
  assert.notEqual(stripeInvoiceSettlementDate(paid, event).getTime(), invoiceCreated * 1000);
  assert.throws(() => stripeInvoiceSettlementDate(null, Number.NaN), /valid settlement timestamp/);
});
