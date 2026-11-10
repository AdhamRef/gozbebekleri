import test from "node:test";
import assert from "node:assert/strict";
import {
  createStripeChargeAttempt, readStripeChargeAttempt, stripeChargeIdempotencyKey,
  stripeChargeCreateParams, stripeIntentMatchesAttempt,
  stripeOneTimeIntentCanSettle, mayReplayStripeChargeAttempt,
  STRIPE_CHARGE_REPLAY_WINDOW_MS, stripeChargeReservationId,
} from "../../lib/donations/stripe-charge-attempt";

const id = "aaaaaaaaaaaaaaaaaaaaaaaa", donorId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const donation = {
  id, donorId, totalAmount: 40.25, currency: "USD", provider: "STRIPE",
  providerOrderId: stripeChargeReservationId(id), subscriptionId: null,
};
const startedAt = Date.parse("2026-11-10T10:00:00Z");
function make() {
  return createStripeChargeAttempt(donation, "Original description", startedAt);
}
const succeeded = (attempt: ReturnType<typeof make>) => ({
  id:"pi_verified_attempt", amount:4025, amount_received:4025, currency:"usd",
  status:"succeeded" as const, client_secret:"secret_not_for_paid_payment",
  metadata:{donationId:id,userId:donorId,chargeAttemptId:attempt.attemptId},
});

test("one-time attempt snapshots original immutable amount and idempotency payload",()=>{
  const attempt=make();
  assert.equal(attempt.amountMinor,4025);
  assert.equal(attempt.currency,"usd");
  assert.equal(attempt.startedAt,startedAt);
  assert.equal(readStripeChargeAttempt(attempt,donation)?.attemptId,attempt.attemptId);
  assert.equal(stripeChargeCreateParams(attempt).amount,4025);
  assert.match(stripeChargeIdempotencyKey(attempt),/^goz-charge-v2-/);
  assert.equal(stripeChargeCreateParams(attempt).metadata?.chargeAttemptId,attempt.attemptId);
});
test("safe replay window never extends beyond conservative Stripe retention",()=>{
  const attempt=make();
  assert.equal(mayReplayStripeChargeAttempt(attempt,startedAt),true);
  assert.equal(mayReplayStripeChargeAttempt(attempt,startedAt+STRIPE_CHARGE_REPLAY_WINDOW_MS-1),true);
  assert.equal(mayReplayStripeChargeAttempt(attempt,startedAt+STRIPE_CHARGE_REPLAY_WINDOW_MS),false);
  assert.equal(mayReplayStripeChargeAttempt(attempt,startedAt+25*60*60*1000),false);
  assert.equal(mayReplayStripeChargeAttempt(attempt,startedAt-1),false);
});
test("positive provider response must prove nonce, owner, currency, amount and success",()=>{
  const attempt=make(), intent=succeeded(attempt);
  assert.equal(stripeIntentMatchesAttempt(intent,attempt),true);
  for(const metadata of [
    {...intent.metadata,chargeAttemptId:"wrong"},
    {...intent.metadata,userId:"wrong"},
    {...intent.metadata,donationId:"wrong"},
  ]) assert.equal(stripeIntentMatchesAttempt({...intent,metadata},attempt),false);
  assert.equal(stripeIntentMatchesAttempt({...intent,amount:4026},attempt),false);
  assert.equal(stripeIntentMatchesAttempt({...intent,amount_received:4024},attempt),false);
  assert.equal(stripeIntentMatchesAttempt({...intent,currency:"eur"},attempt),false);
});
test("signed webhook may settle only exact reserved nonce and no duplicate reference",()=>{
  const attempt=make(), intent=succeeded(attempt);
  const reserved={...donation,stripeChargeAttempt:attempt};
  assert.equal(stripeOneTimeIntentCanSettle(reserved,intent),true);
  assert.equal(stripeOneTimeIntentCanSettle({...reserved,providerOrderId:intent.id},intent),true);
  assert.equal(stripeOneTimeIntentCanSettle({...reserved,providerOrderId:"pi_unrelated"},intent),false);
  assert.equal(stripeOneTimeIntentCanSettle({...reserved,subscriptionId:"subscription-id"},intent),false);
  assert.equal(stripeOneTimeIntentCanSettle({...reserved,stripeChargeAttempt:{...attempt,attemptId:"bad"}},intent),false);
  assert.equal(stripeOneTimeIntentCanSettle({...reserved,stripeChargeAttempt:undefined},intent),false);
  assert.equal(stripeOneTimeIntentCanSettle(reserved,{...intent,status:"processing"}),false);
});
test("amount and currency changes invalidate attempt snapshot",()=>{
  const attempt=make();
  assert.equal(readStripeChargeAttempt(attempt,{...donation,totalAmount:41}),null);
  assert.equal(readStripeChargeAttempt(attempt,{...donation,currency:"EUR"}),null);
});
