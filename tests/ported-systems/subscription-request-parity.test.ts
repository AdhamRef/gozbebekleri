import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { subscriptionRequestsOpen, SUBSCRIPTION_REQUEST_KINDS } from "../../lib/donations/subscription-request-gate";
import { requestMatchesPlan, requestHistory, validReduction, OPEN_REQUEST_STATUSES } from "../../lib/donations/subscription-request-policy";

test("request workflow remains disabled in all environments until checkout and notification review", () => {
  assert.equal(subscriptionRequestsOpen(), false);
  assert.deepEqual(SUBSCRIPTION_REQUEST_KINDS, ["AMOUNT_CHANGE", "PAUSE", "CANCEL"]);
  for (const file of [
    "app/api/admin/subscription-requests/route.ts",
    "app/api/admin/subscription-requests/count/route.ts",
    "app/api/users/me/subscriptions/[id]/requests/route.ts",
  ]) {
    const code = readFileSync(file,"utf8");
    assert.ok(code.includes("subscriptionRequestsOpen()"), file);
    assert.ok(code.includes("FEATURE_NOT_RELEASED"), file);
    assert.ok(!code.includes("sendArchivedEmail("), file);
    assert.ok(!code.includes("notifySubscriptionRequest("), file);
  }
});

test("reduce amount validation is bounded and never implies an executed change", () => {
  assert.equal(validReduction(19.99,20), true);
  for (const amount of [20,25,0,-1,NaN,Infinity,"19",19.999]) assert.equal(validReduction(amount,20),false);
});

test("request completion requires independently verified subscription state", () => {
  const req={kind:"AMOUNT_CHANGE",requestedAmount:10,currency:"USD",donorId:"donor1"};
  const plan={status:"ACTIVE",amount:20,currency:"USD",donorId:"donor1"};
  assert.equal(requestMatchesPlan(req,plan),false);
  assert.equal(requestMatchesPlan(req,{...plan,amount:10}),true);
  assert.equal(requestMatchesPlan(req,{...plan,amount:10,donorId:"other"}),false);
  assert.equal(requestMatchesPlan(req,{...plan,amount:10,currency:"TRY"}),false);
  assert.equal(requestMatchesPlan({kind:"CANCEL",requestedAmount:null},{...plan,status:"ACTIVE"}),false);
  assert.equal(requestMatchesPlan({kind:"CANCEL",requestedAmount:null},{...plan,status:"CANCELLED"}),true);
  assert.equal(requestMatchesPlan({kind:"PAUSE",requestedAmount:null},{...plan,status:"PAUSED"}),true);
});

test("completion policy fails closed when plan ownership or currency evidence is missing", () => {
  const request = { kind: "AMOUNT_CHANGE", requestedAmount: 10, donorId: "donor1", currency: "USD" };
  const verified = { status: "ACTIVE", amount: 10, donorId: "donor1", currency: "USD" };
  assert.equal(requestMatchesPlan(request, verified), true);
  assert.equal(requestMatchesPlan(request, { ...verified, donorId: undefined }), false);
  assert.equal(requestMatchesPlan(request, { ...verified, currency: undefined }), false);
  assert.equal(requestMatchesPlan(request, { ...verified, donorId: "donor2" }), false);
  assert.equal(requestMatchesPlan(request, { ...verified, currency: "TRY" }), false);
  assert.equal(requestMatchesPlan({ ...request, kind: "CANCEL", requestedAmount: null }, { ...verified, status: "CANCELLED", donorId: undefined }), false);
});

test("request timeline ignores invalid values and preserves a bounded history", () => {
  assert.ok(OPEN_REQUEST_STATUSES.includes("NEW"));
  assert.equal(requestHistory([{status:"UNKNOWN",at:"2026-11-07",actorRole:"DONOR"}]).length,0);
  assert.equal(requestHistory(Array.from({length:100},()=>({status:"NEW",at:"2026-11-07T01:00:00Z",actorRole:"DONOR"}))).length,50);
});

test("institutional request records exist, without edits to payment provider models", () => {
  const schema=readFileSync("prisma/schema.prisma","utf8");
  assert.ok(schema.includes("model SubscriptionServiceRequest {"));
  assert.ok(schema.includes("activeKey       String   @unique"));
  assert.ok(schema.includes("model Subscription {"));
  const admin=readFileSync("app/api/admin/subscription-requests/route.ts","utf8");
  assert.ok(admin.includes('requireAdminOrDashboardPermission(session, "monthly")'));
  assert.ok(admin.includes("updatedAt: row.updatedAt"));
  assert.ok(admin.includes("billingChanged: false"));
});
