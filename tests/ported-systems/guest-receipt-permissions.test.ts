import test from "node:test";
import assert from "node:assert/strict";
import { canAccessDonationReceipt } from "../../lib/donations/receipt-access";
import {
  issueGuestReceiptGrant, guestReceiptCookieName, guestPaymentCookieName,
  issueGuestPaymentGrant,
} from "../../lib/donations/guest-payment-grant";

const donationId="aaaaaaaaaaaaaaaaaaaaaaaa";
const donorId="bbbbbbbbbbbbbbbbbbbbbbbb";
process.env.GOZ_GUEST_PAYMENT_KEYS="qa_test:"+Buffer.alloc(32,23).toString("base64url");
function mint(issue:(res:any,id:string)=>void) {
  let result:{name:string,value:string,path:string,httpOnly:boolean}|undefined;
  issue({cookies:{set:(v:any)=>{result=v}}} as any,donationId);
  assert.ok(result);
  return result!;
}
const receipt=mint(issueGuestReceiptGrant);
const payment=mint(issueGuestPaymentGrant);
const fakeRequest=(name:string,value:string)=>({
  cookies:{get:(key:string)=>key===name?{value}:undefined},
}) as any;

test("guest receipt has independent cryptographic scope and narrow cookie path",()=>{
  assert.equal(receipt.path,"/api/donations/"+donationId+"/receipt");
  assert.equal(receipt.httpOnly,true);
  assert.equal(payment.path,"/api/stripe/charge");
  assert.equal(canAccessDonationReceipt(null,donorId,donationId,fakeRequest(receipt.name,receipt.value)),true);
  assert.equal(canAccessDonationReceipt(null,donorId,donationId,fakeRequest(payment.name,payment.value)),false);
  assert.equal(canAccessDonationReceipt(null,donorId,donationId,fakeRequest(receipt.name,receipt.value+"x")),false);
  assert.equal(canAccessDonationReceipt(null,donorId,donationId,fakeRequest(receipt.name,"")),false);
  assert.equal(canAccessDonationReceipt(null,donorId,"cccccccccccccccccccccccc",fakeRequest(receipt.name,receipt.value)),false);
  assert.equal(receipt.name,guestReceiptCookieName(donationId));
  assert.equal(payment.name,guestPaymentCookieName(donationId));
});
test("ADMIN and authorized STAFF may view receipts, but unrelated STAFF and DONOR cannot",()=>{
  const req=fakeRequest(receipt.name,receipt.value);
  assert.equal(canAccessDonationReceipt({id:"admin",role:"ADMIN"},donorId,donationId,req),true);
  assert.equal(canAccessDonationReceipt({id:"staff",role:"STAFF",dashboardPermissions:["revenue"]},donorId,donationId,req),true);
  assert.equal(canAccessDonationReceipt({id:"staff",role:"STAFF",dashboardPermissions:["campaigns"]},donorId,donationId,req),false);
  assert.equal(canAccessDonationReceipt({id:"other",role:"DONOR"},donorId,donationId,req),false);
  assert.equal(canAccessDonationReceipt({id:donorId,role:"DONOR"},donorId,donationId,req),true);
});
test("signed guest receipt expires when signing key is retired",()=>{
  const old=process.env.GOZ_GUEST_PAYMENT_KEYS!;
  process.env.GOZ_GUEST_PAYMENT_KEYS="qa_new:"+Buffer.alloc(32,26).toString("base64url")+","+old;
  try {
    assert.equal(canAccessDonationReceipt(null,donorId,donationId,fakeRequest(receipt.name,receipt.value)),true);
    process.env.GOZ_GUEST_PAYMENT_KEYS="qa_new:"+Buffer.alloc(32,26).toString("base64url");
    assert.equal(canAccessDonationReceipt(null,donorId,donationId,fakeRequest(receipt.name,receipt.value)),false);
  } finally {
    process.env.GOZ_GUEST_PAYMENT_KEYS=old;
  }
});
