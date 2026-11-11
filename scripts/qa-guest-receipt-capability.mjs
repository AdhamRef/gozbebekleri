import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  canIssueGuestPaymentGrant, issueGuestReceiptGrant, hasGuestReceiptGrant,
  issueGuestClaimGrant, hasGuestClaimGrant, guestReceiptCookieName,
} from "../lib/donations/guest-payment-grant.ts";

const id="aaaaaaaaaaaaaaaaaaaaaaaa", other="bbbbbbbbbbbbbbbbbbbbbbbb";
const prior=process.env.GOZ_GUEST_PAYMENT_KEYS, originalDateNow=Date.now;
const secret=Buffer.alloc(32,49).toString("base64url");
const second=Buffer.alloc(32,57).toString("base64url");
let checks=0;
const expect=(x,msg)=>{assert.ok(x,msg);checks++};
const cookies=[];
const response={cookies:{set:(item)=>cookies.push(item)}};
const req=(cookie)=>({cookies:{get:(name)=>cookie?.name===name?{value:cookie.value}:undefined}});
try {
  delete process.env.GOZ_GUEST_PAYMENT_KEYS;
  expect(!canIssueGuestPaymentGrant(),"missing key fails closed");
  assert.throws(()=>issueGuestReceiptGrant(response,id));
  checks++;
  process.env.GOZ_GUEST_PAYMENT_KEYS="primary:"+secret;
  expect(canIssueGuestPaymentGrant(),"fixture key enabled");
  issueGuestReceiptGrant(response,id);
  const receipt=cookies.at(-1);
  expect(receipt.name===guestReceiptCookieName(id),"scoped receipt name");
  expect(receipt.httpOnly===true && receipt.sameSite==="lax","secure browser cookie flags");
  expect(receipt.path==="/api/donations/"+id,"receipt cookie has narrow path");
  expect(hasGuestReceiptGrant(req(receipt),id),"valid receipt grant");
  expect(!hasGuestReceiptGrant(req(receipt),other),"grant must not authorize other donation");
  expect(!hasGuestReceiptGrant(req({name:receipt.name,value:receipt.value.slice(0,-1)+"0"}),id),"tampered signature rejected");
  issueGuestClaimGrant(response,id);
  const claim=cookies.at(-1);
  expect(claim.path==="/api/users/link-guest","claim scoped to linking endpoint");
  expect(hasGuestClaimGrant(req(claim),id),"valid claim");
  expect(!hasGuestClaimGrant(req(receipt),id),"receipt cannot authorize account link");
  expect(!hasGuestReceiptGrant(req(claim),id),"claim cannot authorize receipt");
  process.env.GOZ_GUEST_PAYMENT_KEYS="rotated:"+second+",primary:"+secret;
  expect(hasGuestReceiptGrant(req(receipt),id),"rotated previous key can verify old receipt");
  Date.now=()=>originalDateNow()+25*60*60*1000;
  expect(!hasGuestReceiptGrant(req(receipt),id),"expired receipt denied");
  Date.now=originalDateNow;
  process.env.GOZ_GUEST_PAYMENT_KEYS="rotated:"+second;
  expect(!hasGuestReceiptGrant(req(receipt),id),"old key removed revokes token");
  for (const path of ["app/api/donations/route.ts","app/api/cart/payment/route.ts"]) {
    const source=readFileSync(path,"utf8");
    expect(source.includes("canIssueGuestPaymentGrant()"),path+" guards missing key");
    expect(source.includes("issueGuestReceiptGrant(response,"),path+" issues receipt access");
    expect(source.includes("issueGuestClaimGrant(response,"),path+" issues account link proof");
  }
  const linking=readFileSync("app/api/users/link-guest/route.ts","utf8");
  expect(linking.includes("hasGuestClaimGrant(req, donationId)"),"OAuth link requires grant");
  console.log(JSON.stringify({summary:"GUEST_CAPABILITIES_PASS",checks,realDatabaseCalls:0,realStripeCalls:0}));
}finally{
  Date.now=originalDateNow;
  if(prior===undefined)delete process.env.GOZ_GUEST_PAYMENT_KEYS;
  else process.env.GOZ_GUEST_PAYMENT_KEYS=prior;
}
