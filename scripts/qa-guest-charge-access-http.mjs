import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
const id="aaaaaaaaaaaaaaaaaaaaaaaa",other="bbbbbbbbbbbbbbbbbbbbbbbb",owner="cccccccccccccccccccccccc";
process.env.GOZ_GUEST_PAYMENT_KEYS="qa_charge:"+Buffer.alloc(32,71).toString("base64url");
process.env.STRIPE_SECRET_KEY="sk_test_fake_no_external_network";
const temp=mkdtempSync(resolve(tmpdir(),"goz-charge-access-"));
const state={session:null,reads:0,writes:0,charges:0};
const donation={id,donorId:owner,status:"PENDING",amount:50,totalAmount:50,
 currency:"USD",provider:"STRIPE",locale:"en",
 items:[{campaign:{title:"Synthetic fixture"}}],categoryItems:[]};
globalThis.paymentFixture={state,donation};
const stubs={
 "auth.cjs":'exports.getServerSession=async()=>globalThis.paymentFixture.state.session;',
 "opts.cjs":'exports.authOptions={};',
 "db.cjs":'exports.prisma={donation:{findUnique:async({where})=>{globalThis.paymentFixture.state.reads++;return where.id===globalThis.paymentFixture.donation.id?structuredClone(globalThis.paymentFixture.donation):null},update:async()=>{globalThis.paymentFixture.state.writes++;return{}}}};',
 "stripe.cjs":'class Stripe{constructor(){} paymentIntents={create:async()=>{globalThis.paymentFixture.state.charges++;return{id:"pi_fixture",client_secret:"cs_fixture"}}}};module.exports=Stripe;',
 "next.cjs":'exports.NextResponse={json:(body,opt={})=>Response.json(body,opt)};',
};
for(const [file,body] of Object.entries(stubs))writeFileSync(resolve(temp,file),body);
const names=new Map([
 ["next-auth","auth.cjs"],
 ["@/app/api/auth/[...nextauth]/options","opts.cjs"],
 ["@/lib/prisma","db.cjs"],["stripe","stripe.cjs"],["next/server","next.cjs"],
]);
registerHooks({resolve(spec,ctx,next){const item=names.get(spec);
 return item?{url:pathToFileURL(resolve(temp,item)).href,shortCircuit:true}:next(spec,ctx)}});
const grants=await import("../lib/donations/guest-payment-grant.ts");
const {issueGuestPaymentGrant,issueGuestReceiptGrant}=grants.default??grants;
const {POST}=await import("../app/api/stripe/charge/route.ts");
const cookies=[];
issueGuestPaymentGrant({cookies:{set:(c)=>cookies.push(c)}},id);
issueGuestReceiptGrant({cookies:{set:(c)=>cookies.push(c)}},id);
const charge=cookies.find(c=>c.name.includes("guest_charge"));
const receipt=cookies.find(c=>c.name.includes("guest_receipt"));
async function call({session=null,cookie=null,origin="https://test.fixture.invalid",donationId=id}={}){
 state.session=session;
 const req=new Request("https://test.fixture.invalid/api/stripe/charge",{
  method:"POST",headers:{"content-type":"application/json",...(origin?{origin}:{})},
  body:JSON.stringify({donationId}),
 });
 req.nextUrl=new URL(req.url);
 req.cookies={get:(key)=>cookie?.name===key?{value:cookie.value}:undefined};
 const result=await POST(req);
 return {status:result.status,body:await result.json()};
}
let checks=0;
try{
 assert.equal((await call()).status,403);checks++;
 assert.equal((await call({cookie:receipt})).status,403);checks++;
 assert.equal((await call({cookie:charge,donationId:other})).status,403);checks++;
 assert.equal((await call({cookie:charge,origin:"https://attacker.invalid"})).status,403);checks++;
 assert.equal((await call({cookie:charge,origin:null})).status,403);checks++;
 assert.equal((await call({session:{user:{id:other}},cookie:charge})).status,403);checks++;
 assert.equal(state.charges,0);assert.equal(state.writes,0);checks++;
 const success=await call({cookie:charge});
 assert.equal(success.status,200,JSON.stringify(success));
 assert.equal(success.body.clientSecret,"cs_fixture");checks++;
 assert.equal(state.charges,1);assert.equal(state.writes,1);checks++;
 const ownerCall=await call({session:{user:{id:owner}}});
 assert.equal(ownerCall.status,200);checks++;
 console.log(JSON.stringify({summary:"GUEST_CHARGE_ACCESS_PASS",checks,realStripeCalls:0,realDatabaseCalls:0}));
}finally{rmSync(temp,{recursive:true,force:true})}
