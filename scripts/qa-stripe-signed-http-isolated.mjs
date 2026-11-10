import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import {execFileSync} from "node:child_process";
import {MongoMemoryReplSet} from "mongodb-memory-server";
import {MongoClient,ObjectId} from "mongodb";
import {PrismaClient} from "@prisma/client";
const require=createRequire(import.meta.url),stripePath=require.resolve("stripe");
const dir=mkdtempSync(resolve(tmpdir(),"goz-http-"));
const stubs={
"next.cjs":'exports.NextResponse={json:(x,o={})=>Response.json(x,{status:o.status||200})};exports.after=(fn)=>{globalThis.fixture.afters.push(fn)}',
"db.cjs":'exports.prisma=new Proxy({}, {get(_t,k){const p=globalThis.fixture.prisma;return typeof p[k]==="function"?p[k].bind(p):p[k]}})',
"events.cjs":'exports.dispatchDonationPaid=async()=>{};exports.dispatchEvent=async()=>{};',
"country.cjs":'exports.getDonorCountryCodeForSnapshot=async()=>"TR";',
"conversion.cjs":'exports.sendDonationFailedConversions=async()=>{};',
"stripe.cjs":'const Stripe=require('+JSON.stringify(stripePath)+');module.exports=class MockStripe{constructor(){const x=new Stripe("sk_test_fake_no_network");this.webhooks=x.webhooks;const f=globalThis.fixture;this.subscriptions={retrieve:async id=>({id,...f.remote.get(id)})};this.refunds={retrieve:async id=>{if(!f.refunds.has(id))throw Error("Unknown refund "+id);return f.refunds.get(id)},list:async q=>({data:[...f.refunds.values()].filter(x=>x.charge===q.charge),has_more:false})};this.charges={retrieve:async id=>{if(!f.charges.has(id))throw Error("Unknown charge "+id);return f.charges.get(id)}};this.paymentIntents={retrieve:async id=>{if(!f.intents.has(id))throw Error("Unknown intent "+id);return f.intents.get(id)}};this.invoicePayments={list:async q=>({data:f.invoicePayments.has(q.payment?.payment_intent)?[{invoice:f.invoicePayments.get(q.payment.payment_intent),status:"paid"}]:[],has_more:false})}}}'
};
for(const [k,v] of Object.entries(stubs))writeFileSync(resolve(dir,k),v);
const aliases={"next/server":"next.cjs","@/lib/prisma":"db.cjs","@/lib/events/dispatch":"events.cjs","@/lib/donations/donor-country-code":"country.cjs","@/lib/tracking/donation-conversion-server":"conversion.cjs","stripe":"stripe.cjs"};
registerHooks({resolve(specifier,context,next){return aliases[specifier]?{url:pathToFileURL(resolve(dir,aliases[specifier])).href,shortCircuit:true}:next(specifier,context)}});
const secret="whsec_local_synthetic_only";
process.env.STRIPE_SECRET_KEY="sk_test_fake_no_network";
process.env.STRIPE_WEBHOOK_SECRET=secret;
const repl=await MongoMemoryReplSet.create({binary:{version:"7.0.15"},replSet:{count:1}});
process.env.DATABASE_URL=repl.getUri("goz_http_test");
const mongo=new MongoClient(process.env.DATABASE_URL),prisma=new PrismaClient();
globalThis.fixture={prisma,afters:[],remote:new Map(),refunds:new Map(),charges:new Map(),intents:new Map(),invoicePayments:new Map()};
let server;
let passed=0;
const pass=(name,details={})=>{passed++;console.log(JSON.stringify({name,result:"PASS",...details}))};
try{
await mongo.connect();const db=mongo.db("goz_http_test");
for(const name of ["StripeInvoiceSettlement","StripeRefundSettlement","StripeDeferredRefund","Campaign","Category","Subscription","SubscriptionItem","SubscriptionCategoryItem","Donation","DonationItem","DonationCategoryItem"])await db.createCollection(name);
const preflight = execFileSync(process.execPath,["scripts/preflight-stripe-ledgers.mjs"],{
 env:{...process.env,GOZ_DB_IDENTITY_CONFIRMED:"yes",GOZ_DB_RESTORE_VERIFIED:"yes",GOZ_FINANCE_RELEASE_APPROVED:"yes"},
 encoding:"utf8",
});
assert.ok(preflight.includes('"READ_ONLY_INSPECTION"'));
const provision = execFileSync(process.execPath,["scripts/preflight-stripe-ledgers.mjs","--apply"],{
 env:{...process.env,GOZ_DB_IDENTITY_CONFIRMED:"yes",GOZ_DB_RESTORE_VERIFIED:"yes",GOZ_FINANCE_RELEASE_APPROVED:"yes"},
 encoding:"utf8",
});
assert.ok(provision.includes('"APPLIED_AND_VERIFIED"'));
pass("isolated financial ledger preflight and idempotent index provisioning verified");
const donor=new ObjectId(),campaign=new ObjectId(),category=new ObjectId(),sub=new ObjectId(),donation=new ObjectId();
const created=new Date("2026-11-09T04:00:00Z"),sid="sub_synthetic";
await db.collection("Campaign").insertOne({_id:campaign,title:"Synthetic",description:"Synthetic",targetAmount:1000,currentAmount:0,baselineAmount:0,images:[],categoryIds:[],createdAt:created,updatedAt:created});
await db.collection("Category").insertOne({_id:category,name:"Synthetic",campaignIds:[],currentAmount:0,baselineAmount:0});
await db.collection("Subscription").insertOne({_id:sub,status:"ACTIVE",amount:100,amountUSD:100,currency:"USD",teamSupport:0,coverFees:false,paymentMethod:"CARD",donorId:donor,createdAt:created,payforToken:null});
await db.collection("SubscriptionItem").insertOne({_id:new ObjectId(),subscriptionId:sub,campaignId:campaign,amount:100,amountUSD:100,createdAt:created,updatedAt:created});
await db.collection("SubscriptionCategoryItem").insertOne({_id:new ObjectId(),subscriptionId:sub,categoryId:category,amount:100,amountUSD:100,createdAt:created,updatedAt:created});
await db.collection("Donation").insertOne({_id:donation,status:"PAID",amount:100,amountUSD:100,currency:"USD",totalAmount:100,teamSupport:0,coverFees:false,fees:0,donorId:donor,subscriptionId:sub,provider:"STRIPE",providerOrderId:"in_synthetic_signup",paymentMethod:"CARD",createdAt:created});
globalThis.fixture.remote.set(sid,{metadata:{subscriptionDbId:sub.toHexString(),userId:donor.toHexString()},status:"active",items:{data:[{current_period_end:1796198400}]}});
const {POST}=await import("../app/api/stripe/webhook/route.ts");
server=createServer(async(req,res)=>{
const b=[];for await(const c of req)b.push(c);
const body=Buffer.concat(b);
try{const response=await POST(new Request("http://127.0.0.1/webhook",{method:"POST",headers:{"stripe-signature":req.headers["stripe-signature"]||""},body}));
res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}
catch(error){res.writeHead(500);res.end(String(error))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const uri="http://127.0.0.1:"+server.address().port+"/webhook";
const Stripe=(await import(stripePath)).default;
const signer=new Stripe("sk_test_fake_no_network");
let seq=0;
function evt(type,obj){return {id:"evt_fake_"+(++seq),object:"event",type,api_version:"2026-03-25.dahlia",created:1794210000,data:{object:obj},livemode:false}}
async function send(event,invalid=false){const body=JSON.stringify(event),sig=signer.webhooks.generateTestHeaderString({payload:body,secret:invalid?"whsec_wrong":secret});const res=await fetch(uri,{method:"POST",headers:{"stripe-signature":sig},body});return {status:res.status,body:await res.text()}}
const inv=(id,reason)=>({id,object:"invoice",billing_reason:reason,status:"paid",amount_paid:100,currency:"usd",status_transitions:{paid_at:1794209000},parent:{subscription_details:{subscription:sid}}});
const event=evt("invoice.payment_succeeded",inv("in_synthetic_signup","subscription_create"));
assert.equal((await send(event,true)).status,400);
assert.equal(await db.collection("StripeInvoiceSettlement").countDocuments({}),0);pass("invalid signature rejected");
const firstFailure=await send(evt("invoice.payment_failed",inv("in_synthetic_signup","subscription_create")));
assert.equal(firstFailure.status,200,firstFailure.body);
assert.equal(await db.collection("Donation").countDocuments({subscriptionId:sub}),1,"first failed invoice must not create second donation");
assert.equal((await db.collection("Subscription").findOne({_id:sub})).status,"PAYMENT_FAILED","failed first invoice must disable ACTIVE");
assert.equal((await db.collection("Donation").findOne({_id:donation})).status,"FAILED");
pass("failed first installment marks existing row failed and subscription PAYMENT_FAILED");
const responses=await Promise.all([send(event),send({...event,id:"evt_fake_concurrent"})]);
assert.ok(responses.every(x=>x.status===200),JSON.stringify(responses));
assert.equal(await db.collection("StripeInvoiceSettlement").countDocuments({_id:"in_synthetic_signup"}),1);
assert.equal(await db.collection("Donation").countDocuments({providerOrderId:"in_synthetic_signup",paidAt:{$exists:true}}),1);
assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,100);
assert.equal((await db.collection("Category").findOne({_id:category})).currentAmount,100);
pass("signed HTTP concurrent paid invoice yields one donation and both counters +100");
const checkout=evt("checkout.session.completed",{id:"cs_synthetic",object:"checkout.session",mode:"subscription",payment_status:"paid",subscription:sid,metadata:{donationId:donation.toHexString(),subscriptionDbId:sub.toHexString()}});
assert.equal((await send(checkout)).status,200);
assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,100);pass("checkout after paid invoice never counts payment twice");
const replay=await Promise.all([0,1,2,3].map(i=>send({...event,id:"evt_replay_"+i})));
assert.ok(replay.every(x=>x.status===200));assert.equal((await db.collection("Category").findOne({_id:category})).currentAmount,100);pass("four HTTP signed replays idempotent");
const staleFailure=await send(evt("invoice.payment_failed",inv("in_synthetic_signup","subscription_create")));
assert.equal(staleFailure.status,200);
assert.equal((await db.collection("Subscription").findOne({_id:sub})).status,"ACTIVE");
assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,100);
pass("late failed event cannot undo already settled first charge");
const renewal=await send(evt("invoice.payment_succeeded",inv("in_synthetic_renewal","subscription_cycle")));
assert.equal(renewal.status,200,renewal.body);
assert.equal(await db.collection("Donation").countDocuments({subscriptionId:sub,paidAt:{$exists:true}}),2);
assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,200);
assert.equal((await db.collection("Category").findOne({_id:category})).currentAmount,200);pass("renewal counts exactly once");
const fail=await send(evt("invoice.payment_failed",inv("in_synthetic_failed","subscription_cycle")));
assert.equal(fail.status,200,fail.body);assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,200);pass("failed renewal does not inflate revenue");
const cancel=await send(evt("customer.subscription.deleted",{id:sid,object:"subscription",status:"canceled"}));
assert.equal(cancel.status,200);assert.equal((await db.collection("Subscription").findOne({_id:sub})).status,"CANCELLED");pass("cancellation marks subscription canceled");
globalThis.fixture.remote.set(sid,{metadata:{subscriptionDbId:sub.toHexString(),userId:donor.toHexString()},status:"active",items:{data:[{current_period_end:1796198400}]}});
const resumed=await send(evt("customer.subscription.updated",{id:sid,object:"subscription",status:"active"}));
assert.equal(resumed.status,200);
assert.equal((await db.collection("Subscription").findOne({_id:sub})).status,"ACTIVE");
pass("provider-confirmed reactivation resumes a previously settled subscription");
globalThis.fixture.remote.set(sid,{metadata:{subscriptionDbId:sub.toHexString(),userId:donor.toHexString()},status:"canceled",items:{data:[{current_period_end:1796198400}]}});
const staleActive=await send(evt("customer.subscription.updated",{id:sid,object:"subscription",status:"active"}));
assert.equal(staleActive.status,200);
assert.equal((await db.collection("Subscription").findOne({_id:sub})).status,"CANCELLED");
pass("out-of-order subscription.updated uses latest provider status, not stale payload");

const firstCharge="ch_signup_synth", firstPi="pi_signup_synth";
globalThis.fixture.charges.set(firstCharge,{id:firstCharge,amount:10000,currency:"usd",paid:true,captured:true,payment_intent:firstPi,invoice:"in_synthetic_signup",metadata:{}});
globalThis.fixture.intents.set(firstPi,{id:firstPi,invoice:"in_synthetic_signup",metadata:{}});
const addRefund=(id,amount,chargeId=firstCharge,status="succeeded",currency="usd")=>{
 globalThis.fixture.refunds.set(id,{id,object:"refund",amount,charge:chargeId,payment_intent:globalThis.fixture.charges.get(chargeId)?.payment_intent ?? "pi_missing",currency,status});
};
const refunded=async()=>{const x=await prisma.donation.findUnique({where:{id:donation.toHexString()}});return x?.refundedTotalAmount??0};
const balance=async()=>[(await db.collection("Campaign").findOne({_id:campaign})).currentAmount,(await db.collection("Category").findOne({_id:category})).currentAmount];
addRefund("re_signup_partial40",4000);
const partial=await send(evt("refund.updated",{id:"re_signup_partial40",object:"refund"}));
assert.equal(partial.status,200,partial.body);
assert.deepEqual(await balance(),[160,160]);assert.equal(await refunded(),40);
pass("verified signed partial refund 40 yields gross 200 net 160 for two invoices");
const repeat=await Promise.all([0,1,2,3].map(()=>send(evt("refund.updated",{id:"re_signup_partial40",object:"refund"}))));
assert.ok(repeat.every(x=>x.status===200));assert.deepEqual(await balance(),[160,160]);
assert.equal(await db.collection("StripeRefundSettlement").countDocuments({_id:"re_signup_partial40"}),1);
pass("four concurrent replays of the same refund leave exactly one ledger record");
addRefund("re_signup_remaining60",6000);
const finalRefund=await send(evt("charge.refunded",{id:firstCharge,object:"charge"}));
assert.equal(finalRefund.status,200,finalRefund.body);
assert.equal(await refunded(),100);assert.deepEqual(await balance(),[100,100]);
const settled=await prisma.donation.findUnique({where:{id:donation.toHexString()}});
assert.equal(settled.status,"PAID");assert.ok(settled.paidAt);
pass("remaining 60 refunded: original charge net zero, paidAt unchanged, another renewal intact");
const renewalCharge="ch_renew_synth",renewPi="pi_renew_synth";
globalThis.fixture.charges.set(renewalCharge,{id:renewalCharge,amount:10000,currency:"usd",paid:true,captured:true,payment_intent:renewPi,metadata:{}});
globalThis.fixture.intents.set(renewPi,{id:renewPi,metadata:{}});
globalThis.fixture.invoicePayments.set(renewPi,"in_synthetic_renewal");
addRefund("re_renew20",2000,renewalCharge);addRefund("re_renew30",3000,renewalCharge);
const concurrent=await Promise.all([send(evt("refund.updated",{id:"re_renew20",object:"refund"})),send(evt("refund.updated",{id:"re_renew30",object:"refund"}))]);
assert.ok(concurrent.every(x=>x.status===200),JSON.stringify(concurrent));
assert.deepEqual(await balance(),[50,50]);
pass("two different partial refunds on same charge in parallel reduce only that invoice");
const beforePending=await balance();
addRefund("re_renew_pending",2000,renewalCharge,"pending");
assert.equal((await send(evt("refund.created",{id:"re_renew_pending",object:"refund"}))).status,200);
assert.deepEqual(await balance(),beforePending);
pass("pending refund does not reduce booked balances");
globalThis.fixture.refunds.get("re_renew_pending").status="succeeded";
assert.equal((await send(evt("refund.updated",{id:"re_renew_pending",object:"refund"}))).status,200);
assert.deepEqual(await balance(),[30,30]);
globalThis.fixture.refunds.get("re_renew_pending").status="failed";
assert.equal((await send(evt("refund.failed",{id:"re_renew_pending",object:"refund"}))).status,200);
assert.deepEqual(await balance(),[50,50]);
pass("successful refund later failed restores its previous monetary effect");
addRefund("re_unknown",2000,"ch_unknown");
const unknown=await send(evt("refund.updated",{id:"re_unknown",object:"refund"}));
assert.equal(unknown.status,500);assert.deepEqual(await balance(),[50,50]);
pass("unknown charge fails closed and leaves financial balances unchanged");
addRefund("re_wrong_currency",1000,renewalCharge,"succeeded","try");
const mismatch=await send(evt("refund.updated",{id:"re_wrong_currency",object:"refund"}));
assert.equal(mismatch.status,500);assert.deepEqual(await balance(),[50,50]);
pass("provider currency mismatch rejected without ledger mutation");

const fixtureDonation=new ObjectId();
const projectA=new ObjectId(),projectB=new ObjectId(),categoryA=new ObjectId(),categoryB=new ObjectId();
for(const [id,value] of [[projectA,60],[projectB,40]]) {
 await db.collection("Campaign").insertOne({_id:id,title:"Synthetic allocation",description:"Fixture",targetAmount:1000,currentAmount:value,baselineAmount:0,images:[],categoryIds:[],createdAt:created,updatedAt:created});
}
for(const [id,value] of [[categoryA,70],[categoryB,30]]) {
 await db.collection("Category").insertOne({_id:id,name:"Synthetic allocation",campaignIds:[],currentAmount:value,baselineAmount:0});
}
const piSplit="pi_multi_split",chSplit="ch_multi_split";
globalThis.fixture.charges.set(chSplit,{id:chSplit,amount:11000,currency:"usd",paid:true,captured:true,payment_intent:piSplit,metadata:{donationId:fixtureDonation.toHexString()}});
globalThis.fixture.intents.set(piSplit,{id:piSplit,metadata:{donationId:fixtureDonation.toHexString()}});
globalThis.fixture.refunds.set("re_before_paid",{id:"re_before_paid",object:"refund",amount:5500,charge:chSplit,payment_intent:piSplit,currency:"usd",status:"succeeded"});
const early=await send(evt("refund.updated",{id:"re_before_paid",object:"refund"}));
assert.equal(early.status,200,"early signed refund must be durably queued before acknowledgment");
assert.equal(await db.collection("StripeRefundSettlement").countDocuments({_id:"re_before_paid"}),0);
assert.equal(await db.collection("StripeDeferredRefund").countDocuments({_id:"re_before_paid",status:"PENDING"}),1);
pass("early signed refund persisted to a durable, idempotent retry queue without premature accounting");
await db.collection("Donation").insertOne({_id:fixtureDonation,donorId:donor,amount:100,amountUSD:100,teamSupport:5,fees:5,coverFees:true,totalAmount:110,currency:"USD",status:"PAID",paidAt:created,createdAt:created,provider:"STRIPE",providerOrderId:piSplit,providerAuthCode:piSplit,paymentMethod:"CARD"});
for(const [id,amount] of [[projectA,60],[projectB,40]]) await db.collection("DonationItem").insertOne({_id:new ObjectId(),donationId:fixtureDonation,campaignId:id,amount,amountUSD:amount,createdAt:created,updatedAt:created});
for(const [id,amount] of [[categoryA,70],[categoryB,30]]) await db.collection("DonationCategoryItem").insertOne({_id:new ObjectId(),donationId:fixtureDonation,categoryId:id,amount,amountUSD:amount,createdAt:created,updatedAt:created});
await prisma.stripeDeferredRefund.update({where:{id:"re_before_paid"},data:{nextAttemptAt:new Date(0)}});
const {reconcileDeferredStripeRefunds}=await import("../lib/donations/stripe-refund-deferred.ts");
const recovery=await reconcileDeferredStripeRefunds(prisma,{
  refunds:{retrieve:async id=>globalThis.fixture.refunds.get(id)},
  charges:{retrieve:async id=>globalThis.fixture.charges.get(id)},
  paymentIntents:{retrieve:async id=>globalThis.fixture.intents.get(id)},
  invoicePayments:{list:async q=>({data:[],has_more:false})},
});
assert.equal(recovery.resolved,1,JSON.stringify(recovery));
assert.equal(await db.collection("StripeDeferredRefund").countDocuments({_id:"re_before_paid",status:"RESOLVED"}),1);
pass("scheduled refund reconciliation replays the early refund after local payment becomes PAID");
const completed=await send(evt("refund.updated",{id:"re_before_paid",object:"refund"}));
assert.equal(completed.status,200,completed.body);
const da=await prisma.donation.findUnique({where:{id:fixtureDonation.toHexString()}});
assert.equal(da.refundedTotalAmount,55);assert.equal(da.refundedAmountUSD,50);
assert.equal(da.refundedTeamSupport,2.5);assert.equal(da.refundedFees,2.5);
for(const [id,value] of [[projectA,30],[projectB,20]]) assert.equal((await db.collection("Campaign").findOne({_id:id})).currentAmount,value);
for(const [id,value] of [[categoryA,35],[categoryB,15]]) assert.equal((await db.collection("Category").findOne({_id:id})).currentAmount,value);
pass("110 paid with 100 cause +5 support +5 fees: 55 refunded splits cause/support/fees and 2 projects + 2 categories");
const projection=(await import("../lib/dashboard/donation-refund-finance.ts")).donationGrossRefundNet;
const view=projection(da);
assert.equal(view.grossChargedUSD,110);assert.equal(view.refundedChargedUSD,55);assert.equal(view.netChargedUSD,55);assert.equal(view.netCauseUSD,50);
pass("refund finance projection reports gross=110 refunded=55 net=55; net cause=50");
const wrongValue=globalThis.fixture.charges.get(chSplit);
wrongValue.amount=9000;
const mismatchValue=await send(evt("refund.updated",{id:"re_before_paid",object:"refund"}));
assert.equal(mismatchValue.status,500);
assert.equal((await db.collection("Campaign").findOne({_id:projectA})).currentAmount,30);
pass("changed Stripe original amount rejects refund replay without modifying applied ledger");
wrongValue.amount=11000;

const unallocated=new ObjectId(),unallocatedPi="pi_no_alloc_synth",unallocatedCharge="ch_no_alloc_synth";
await db.collection("Donation").insertOne({_id:unallocated,donorId:donor,amount:100,amountUSD:100,teamSupport:0,fees:0,coverFees:false,totalAmount:100,currency:"USD",status:"PAID",paidAt:created,createdAt:created,provider:"STRIPE",providerOrderId:unallocatedPi,paymentMethod:"CARD"});
globalThis.fixture.charges.set(unallocatedCharge,{id:unallocatedCharge,amount:10000,currency:"usd",paid:true,captured:true,payment_intent:unallocatedPi,metadata:{donationId:unallocated.toHexString()}});
globalThis.fixture.intents.set(unallocatedPi,{id:unallocatedPi,metadata:{donationId:unallocated.toHexString()}});
addRefund("re_no_allocation",2000,unallocatedCharge);
const noAllocation=await send(evt("refund.updated",{id:"re_no_allocation",object:"refund"}));
assert.equal(noAllocation.status,500);
assert.equal(await db.collection("StripeRefundSettlement").countDocuments({_id:"re_no_allocation"}),0);
pass("originally paid donation missing project allocation cannot silently settle a refund");

const jpyDonation=new ObjectId(),jpyPi="pi_jpy_synth",jpyCharge="ch_jpy_synth",jpyProject=new ObjectId();
await db.collection("Campaign").insertOne({_id:jpyProject,title:"JPY synthetic",description:"JPY",targetAmount:10,currentAmount:0.7,baselineAmount:0,images:[],categoryIds:[],createdAt:created,updatedAt:created});
await db.collection("Donation").insertOne({_id:jpyDonation,donorId:donor,amount:100,amountUSD:0.7,teamSupport:0,fees:0,coverFees:false,totalAmount:100,currency:"JPY",status:"PAID",paidAt:created,createdAt:created,provider:"STRIPE",providerOrderId:jpyPi,paymentMethod:"CARD"});
await db.collection("DonationItem").insertOne({_id:new ObjectId(),donationId:jpyDonation,campaignId:jpyProject,amount:100,amountUSD:0.7,createdAt:created,updatedAt:created});
globalThis.fixture.charges.set(jpyCharge,{id:jpyCharge,amount:100,currency:"jpy",paid:true,captured:true,payment_intent:jpyPi,metadata:{donationId:jpyDonation.toHexString()}});
globalThis.fixture.intents.set(jpyPi,{id:jpyPi,metadata:{donationId:jpyDonation.toHexString()}});
globalThis.fixture.refunds.set("re_jpy_half",{id:"re_jpy_half",object:"refund",amount:50,charge:jpyCharge,payment_intent:jpyPi,currency:"jpy",status:"succeeded"});
const jpyResult=await send(evt("refund.updated",{id:"re_jpy_half",object:"refund"}));
assert.equal(jpyResult.status,200,jpyResult.body);
assert.equal((await db.collection("Campaign").findOne({_id:jpyProject})).currentAmount,0.35);
assert.equal((await prisma.donation.findUnique({where:{id:jpyDonation.toHexString()}})).refundedTotalAmount,50);
pass("zero-decimal JPY correctly reconciles 100 yen captured and 50 yen refund using saved historical FX");

// Independent signed HTTP, real isolated MongoDB one-time settlement regression.
// No provider requests or production fixtures; refund and recurring tests above
// remain untouched.
const oneCampaign=new ObjectId(),oneCategory=new ObjectId();
await db.collection("Campaign").insertOne({_id:oneCampaign,title:"Signed one-time fixture",description:"Synthetic",targetAmount:3000,currentAmount:0,baselineAmount:0,images:[],categoryIds:[],createdAt:created,updatedAt:created});
await db.collection("Category").insertOne({_id:oneCategory,name:"Signed one-time fixture",campaignIds:[],currentAmount:0,baselineAmount:0});
async function oneTimeRow(reference,amount=25) {
 const id=new ObjectId();
 await db.collection("Donation").insertOne({
   _id:id,donorId:donor,amount,amountUSD:amount,teamSupport:0,fees:0,coverFees:false,
   totalAmount:amount,currency:"USD",status:"PAID",provider:"STRIPE",
   providerOrderId:reference,paymentMethod:"CARD",createdAt:created
 });
 await db.collection("DonationItem").insertOne({_id:new ObjectId(),donationId:id,campaignId:oneCampaign,amount,amountUSD:amount,createdAt:created,updatedAt:created});
 await db.collection("DonationCategoryItem").insertOne({_id:new ObjectId(),donationId:id,categoryId:oneCategory,amount,amountUSD:amount,createdAt:created,updatedAt:created});
 return id;
}
async function oneBalance(){
 return [(await db.collection("Campaign").findOne({_id:oneCampaign})).currentAmount,
         (await db.collection("Category").findOne({_id:oneCategory})).currentAmount];
}
const onePi="pi_one_time_synthetic";
const oneId=await oneTimeRow(onePi);
const oneIntent=(id=onePi,amount=2500,currency="usd")=>({
 id,object:"payment_intent",status:"succeeded",amount:2500,amount_received:amount,
 currency,metadata:{donationId:oneId.toHexString()}
});
assert.equal((await send(evt("payment_intent.succeeded",oneIntent(onePi,2499)))).status,500);
assert.equal((await send(evt("payment_intent.succeeded",oneIntent(onePi,2500,"eur")))).status,500);
assert.equal((await send(evt("payment_intent.succeeded",oneIntent("pi_wrong_one_time")))).status,500);
assert.deepEqual(await oneBalance(),[0,0]);
assert.equal((await db.collection("Donation").findOne({_id:oneId})).paidAt,undefined);
pass("signed direct PaymentIntent rejects amount, currency and wrong provider reference without booking");
const onePaid=evt("payment_intent.succeeded",oneIntent());
assert.equal((await send(onePaid)).status,200);
assert.deepEqual(await oneBalance(),[25,25]);
assert.ok((await db.collection("Donation").findOne({_id:oneId})).paidAt);
pass("signed direct PaymentIntent settles exactly one donation and both allocations");
const directReplay=await Promise.all([send(onePaid),send({...onePaid,id:"evt_direct_replay"})]);
assert.ok(directReplay.every(x=>x.status===200));
assert.deepEqual(await oneBalance(),[25,25]);
assert.equal((await send(evt("payment_intent.succeeded",oneIntent("pi_late_wrong")))).status,200);
assert.deepEqual(await oneBalance(),[25,25]);
pass("signed direct duplicate and late wrong event cannot double-book confirmed donation");
const cs="cs_one_time_synthetic",checkoutId=await oneTimeRow(cs);
const checkoutPayload=(id=cs,amount=2500,currency="usd")=>({
 id,object:"checkout.session",mode:"payment",payment_status:"paid",
 amount_total:amount,currency,metadata:{donationId:checkoutId.toHexString()},
 payment_intent:"pi_checkout_one_time"
});
assert.equal((await send(evt("checkout.session.completed",checkoutPayload(cs,2400)))).status,500);
assert.equal((await send(evt("checkout.session.completed",checkoutPayload(cs,2500,"try")))).status,500);
assert.equal((await send(evt("checkout.session.completed",checkoutPayload("cs_wrong_one_time")))).status,500);
assert.deepEqual(await oneBalance(),[25,25]);
pass("signed Checkout refuses amount, currency, and session reference mismatches");
const checkoutPaid=evt("checkout.session.completed",checkoutPayload());
assert.equal((await send(checkoutPaid)).status,200);
assert.deepEqual(await oneBalance(),[50,50]);
assert.equal((await send(checkoutPaid)).status,200);
assert.deepEqual(await oneBalance(),[50,50]);
pass("signed paid Checkout settles once; repeated delivery cannot increment allocations");
const checkoutIntent=oneIntent("pi_checkout_one_time",2500,"usd");
checkoutIntent.metadata.donationId=checkoutId.toHexString();
assert.equal((await send(evt("payment_intent.succeeded",checkoutIntent))).status,200);
assert.deepEqual(await oneBalance(),[50,50]);
pass("late Checkout-owned PaymentIntent never settles the same donation twice");


const {donationFieldEmpty}=await import("../lib/donations/mongo-null.ts");
const casDonation=await oneTimeRow(null);
const reserve="goz_charge_reserved_"+casDonation.toHexString();
const claimWhere={AND:[
  {id:casDonation.toHexString(),donorId:donor.toHexString(),status:"PAID"},
  donationFieldEmpty("subscriptionId"),
  donationFieldEmpty("paidAt"),
  donationFieldEmpty("providerOrderId"),
  {OR:[{provider:null},{provider:{isSet:false}},{provider:"STRIPE"}]},
]};
const claims=await Promise.all([prisma.donation.updateMany({where:claimWhere,data:{provider:"STRIPE",providerOrderId:reserve}}),
  prisma.donation.updateMany({where:claimWhere,data:{provider:"STRIPE",providerOrderId:reserve}})]);
assert.equal(claims.reduce((sum,x)=>sum+x.count,0),1);
assert.equal((await db.collection("Donation").findOne({_id:casDonation})).providerOrderId,reserve);
pass("isolated MongoDB CAS permits exactly one concurrent payment-reference reservation");

console.log(JSON.stringify({summary:"SIGNED_HTTP_REFUNDS_PASS",passed,refund:"PASS",database:"isolated MongoDB",stripeCalls:0}));
}finally{if(server)await new Promise(ok=>server.close(ok));await prisma.$disconnect();await mongo.close();await repl.stop();rmSync(dir,{recursive:true,force:true})}
