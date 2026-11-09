import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
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
"stripe.cjs":'const Stripe=require('+JSON.stringify(stripePath)+');module.exports=class MockStripe{constructor(){const x=new Stripe("sk_test_fake_no_network");this.webhooks=x.webhooks;this.subscriptions={retrieve:async id=>({id,...globalThis.fixture.remote.get(id)})}}}'
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
globalThis.fixture={prisma,afters:[],remote:new Map()};
let server;
let passed=0;
const pass=(name,details={})=>{passed++;console.log(JSON.stringify({name,result:"PASS",...details}))};
try{
await mongo.connect();const db=mongo.db("goz_http_test");
for(const name of ["StripeInvoiceSettlement","Campaign","Category","Subscription","SubscriptionItem","SubscriptionCategoryItem","Donation","DonationItem","DonationCategoryItem"])await db.createCollection(name);
const donor=new ObjectId(),campaign=new ObjectId(),category=new ObjectId(),sub=new ObjectId(),donation=new ObjectId();
const created=new Date("2026-11-09T04:00:00Z"),sid="sub_synthetic";
await db.collection("Campaign").insertOne({_id:campaign,title:"Synthetic",description:"Synthetic",targetAmount:1000,currentAmount:0,baselineAmount:0,images:[]});
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
const renewal=await send(evt("invoice.payment_succeeded",inv("in_synthetic_renewal","subscription_cycle")));
assert.equal(renewal.status,200,renewal.body);
assert.equal(await db.collection("Donation").countDocuments({subscriptionId:sub,paidAt:{$exists:true}}),2);
assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,200);
assert.equal((await db.collection("Category").findOne({_id:category})).currentAmount,200);pass("renewal counts exactly once");
const fail=await send(evt("invoice.payment_failed",inv("in_synthetic_failed","subscription_cycle")));
assert.equal(fail.status,200,fail.body);assert.equal((await db.collection("Campaign").findOne({_id:campaign})).currentAmount,200);pass("failed renewal does not inflate revenue");
const cancel=await send(evt("customer.subscription.deleted",{id:sid,object:"subscription",status:"canceled"}));
assert.equal(cancel.status,200);assert.equal((await db.collection("Subscription").findOne({_id:sub})).status,"CANCELLED");pass("cancellation marks subscription canceled");
const refund=await send(evt("charge.refunded",{id:"ch_synthetic",object:"charge",payment_intent:"pi_synthetic",amount_refunded:100,refunded:true}));
assert.equal(refund.status,200);
console.log(JSON.stringify({name:"refund accounting",result:"BLOCKED",reason:"Webhook ignores charge.refunded; no financial reversal observed",campaignAmount:(await db.collection("Campaign").findOne({_id:campaign})).currentAmount}));
console.log(JSON.stringify({summary:"SIGNED_HTTP_PASS",passed,refund:"BLOCKED",database:"isolated MongoDB",stripeCalls:0}));
}finally{if(server)await new Promise(ok=>server.close(ok));await prisma.$disconnect();await mongo.close();await repl.stop();rmSync(dir,{recursive:true,force:true})}
