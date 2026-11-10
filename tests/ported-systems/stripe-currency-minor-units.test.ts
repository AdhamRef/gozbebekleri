import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_CURRENCY_CODES } from "../../lib/supported-currencies";
import { stripeMinorDigits, stripeAmountInMinorUnits } from "../../lib/donations/stripe-minor-units";
import { createStripeChargeAttempt, readStripeChargeAttempt } from "../../lib/donations/stripe-charge-attempt";
import { stripeOneTimePaymentMatchesDonation } from "../../lib/donations/stripe-one-time-payment";

const id="aaaaaaaaaaaaaaaaaaaaaaaa", donorId="bbbbbbbbbbbbbbbbbbbbbbbb";
const three = ["KWD","BHD","OMR","JOD"];
test("all 14 selectable/legacy donation currencies are explicitly mapped",()=>{
  assert.equal(SUPPORTED_CURRENCY_CODES.length,14);
  for(const c of SUPPORTED_CURRENCY_CODES) assert.equal(stripeMinorDigits(c),three.includes(c)?3:2,c);
  for(const c of three) {
    assert.equal(stripeAmountInMinorUnits(12.34,c),12340,c);
    assert.equal(stripeAmountInMinorUnits(0.01,c),10,c);
    assert.throws(()=>stripeAmountInMinorUnits(12.345,c),/STRIPE_AMOUNT_PRECISION_OR_LIMIT/,c);
    const donation={id,donorId,totalAmount:12.34,currency:c,provider:"STRIPE",providerOrderId:"pi_currency_test",subscriptionId:null};
    const attempt=createStripeChargeAttempt(donation,"fixture");
    assert.equal(attempt.amountMinor,12340);
    assert.equal(readStripeChargeAttempt(attempt,donation)?.amountMinor,12340);
    assert.equal(stripeOneTimePaymentMatchesDonation(donation,{id:"pi_currency_test",amountMinor:12340,currency:c.toLowerCase()}),true);
    assert.equal(stripeOneTimePaymentMatchesDonation(donation,{id:"pi_currency_test",amountMinor:1234,currency:c.toLowerCase()}),false);
  }
});
test("2-decimal Stripe currencies strictly preserve cents",()=>{
  for(const c of SUPPORTED_CURRENCY_CODES.filter(x=>!three.includes(x))){
    assert.equal(stripeAmountInMinorUnits(12.34,c),1234,c);
    assert.throws(()=>stripeAmountInMinorUnits(12.345,c),/STRIPE_AMOUNT_PRECISION_OR_LIMIT/);
    assert.equal(stripeAmountInMinorUnits(0.01,c),1,c);
  }
});
test("unsupported, zero-decimal, non-finite and over-limit charges are rejected",()=>{
  for(const c of ["JPY","HUF","ISK","UGX","XYZ","","DEFAULT"]){
    assert.equal(stripeMinorDigits(c),null);
    assert.throws(()=>stripeAmountInMinorUnits(10,c),/STRIPE_UNSUPPORTED_CURRENCY/);
  }
  for(const amount of [-1,0,NaN,Infinity,999999999.99,0.001]) {
    assert.throws(()=>stripeAmountInMinorUnits(amount,"USD"));
  }
});
test("one-time settlement fails closed for unsupported currency",()=>{
  const d={totalAmount:100,currency:"JPY",provider:"STRIPE",providerOrderId:"pi_one",subscriptionId:null};
  assert.equal(stripeOneTimePaymentMatchesDonation(d,{id:"pi_one",amountMinor:100,currency:"jpy"}),false);
});
