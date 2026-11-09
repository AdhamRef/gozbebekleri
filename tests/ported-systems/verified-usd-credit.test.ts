import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import { verifiedUsdCredit } from "../../lib/donations/verified-usd-credit";
test("recorded USD credits and USD-native values are accepted",()=>{
  assert.equal(verifiedUsdCredit(5000,14.5,"TRY"),14.5);
  assert.equal(verifiedUsdCredit(7,null,"USD"),7);
  assert.equal(verifiedUsdCredit(8,0,"EUR"),0);
});
test("missing non-USD FX never becomes a false USD campaign progress increment",()=>{
  assert.equal(verifiedUsdCredit(5000,null,"TRY"),null);
  assert.equal(verifiedUsdCredit(2000,undefined,"SAR"),null);
  assert.equal(verifiedUsdCredit(34,undefined,"EUR"),null);
  assert.equal(verifiedUsdCredit(-1,null,"USD"),null);
});
test("webhook financial increments use verified USD before campaign or category mutation",()=>{
  const src=readFileSync("app/api/stripe/webhook/route.ts","utf8");
  assert.match(src,/verifiedUsdCredit\(item\.amount, item\.amountUSD, dbSubscription\.currency\)/);
  assert.doesNotMatch(src,/currentAmount: \{ increment: item\.amountUSD \?\? item\.amount \}/);
});
