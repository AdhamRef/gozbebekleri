import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripeOneTimePaymentMatchesDonation as matches } from "../../lib/donations/stripe-one-time-payment";

const donation = {
  totalAmount: 120.35,
  currency: "USD",
  provider: "STRIPE",
  providerOrderId: "pi_test_verified",
  subscriptionId: null,
};
const payment = { id: "pi_test_verified", amountMinor: 12035, currency: "usd" };

test("one-time Stripe settlement accepts exact captured amount, currency and original reference", () => {
  assert.equal(matches(donation, payment), true);
  assert.equal(matches({ ...donation, currency: " UsD " }, payment), true);
});

test("one-time Stripe settlement refuses a different provider, payment reference or recurring donation", () => {
  assert.equal(matches(donation, { ...payment, id: "pi_different" }), false);
  assert.equal(matches({ ...donation, providerOrderId: null }, payment), false);
  assert.equal(matches({ ...donation, provider: "PAYFOR" }, payment), false);
  assert.equal(matches({ ...donation, subscriptionId: "sub_internal" }, payment), false);
});

test("one-time Stripe settlement refuses partial, excess, invalid or absent captured amounts", () => {
  for (const amountMinor of [12034, 12036, 120, 0, -12035, null, undefined, 12035.5, Infinity, NaN]) {
    assert.equal(matches(donation, { ...payment, amountMinor }), false, String(amountMinor));
  }
  for (const totalAmount of [0, -1, Infinity, NaN]) {
    assert.equal(matches({ ...donation, totalAmount }, payment), false, String(totalAmount));
  }
});

test("one-time Stripe settlement refuses currency mismatches", () => {
  for (const currency of ["eur", "try", "", null, undefined]) {
    assert.equal(matches(donation, { ...payment, currency }), false, String(currency));
  }
});

test("both signed one-time webhook paths use the financial settlement guard", () => {
  const src = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  const checkout = src.slice(src.indexOf('case "checkout.session.completed":'), src.indexOf('case "invoice.payment_succeeded":'));
  const intent = src.slice(src.indexOf('case "payment_intent.succeeded":'), src.indexOf('case "payment_intent.payment_failed":'));
  assert.match(checkout, /stripeOneTimePaymentMatchesDonation\(donation,\s*\{/);
  assert.match(checkout, /amountMinor:\s*session\.amount_total/);
  assert.match(checkout, /currency:\s*session\.currency/);
  assert.match(intent, /stripeOneTimePaymentMatchesDonation\(donation,\s*\{/);
  assert.match(intent, /amountMinor:\s*intent\.amount_received/);
  assert.match(intent, /currency:\s*intent\.currency/);
  assert.match(intent, /intent\.status !== "succeeded"/);
  assert.match(intent, /providerOrderId\?\.startsWith\("cs_"\)/);
});
