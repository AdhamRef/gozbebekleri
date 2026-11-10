import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";

const donationId="aaaaaaaaaaaaaaaaaaaaaaaa",donorId="bbbbbbbbbbbbbbbbbbbbbbbb";
process.env.CRON_SECRET="qa-cron-secret-32-or-more-synthetic-bytes";
process.env.STRIPE_SECRET_KEY="sk_test_local_fake_not_network";
const dir=mkdtempSync(resolve(tmpdir(),"goz-internal-recovery-"));
const modules={
 "db.cjs":'exports.prisma=globalThis.recoveryFixture.prisma;',
 "next.cjs":'exports.NextResponse={json:(x,opt={})=>Response.json(x,opt)};exports.after=()=>{};',
 "events.cjs":'exports.dispatchDonationPaid=async()=>{};',
 "stripe.cjs":'module.exports=class Stripe{constructor(){this.paymentIntents={retrieve:async id=>{globalThis.recoveryFixture.stripeReads++;return {id,amount:2000,amount_received:2000,currency:"usd",status:"succeeded",metadata:{donationId:"aaaaaaaaaaaaaaaaaaaaaaaa"}}}}}};',
};
for(const [name,data] of Object.entries(modules))writeFileSync(resolve(dir,name),data);
const aliases=new Map([
 ["@/lib/prisma","db.cjs"],["next/server","next.cjs"],
 ["@/lib/events/dispatch","events.cjs"],["stripe","stripe.cjs"],
]);
registerHooks({resolve(spec,ctx,next){const path=aliases.get(spec);return path?{url:pathToFileURL(resolve(dir,path)).href,shortCircuit:true}:next(spec,ctx)}});
const row={
 id:donationId,donorId,provider:"STRIPE",providerOrderId:"pi_synthetic_valid",
 totalAmount:20,amount:20,currency:"USD",status:"PAID",subscriptionId:null,
 paidAt:null,stripeChargeAttempt:null,
 items:[{campaignId:"cccccccccccccccccccccccc",amount:20,amountUSD:20}],
 categoryItems:[],
};
const fixture={donation:row,amount:0,stripeReads:0,dbWrites:0};
let lock=Promise.resolve();
fixture.prisma={
 donation:{findUnique:async()=>structuredClone(fixture.donation)},
 $transaction:async fn=>{
  const prev=lock;let release;lock=new Promise(resolve=>release=resolve);
  await prev;
  try{
   return await fn({
    donation:{
     findUnique:async()=>structuredClone(fixture.donation),
     update:async({data})=>{fixture.dbWrites++;Object.assign(fixture.donation,data)}
    },
    campaign:{update:async({data})=>{fixture.amount+=data.currentAmount.increment}},
    category:{update:async()=>{throw Error("unrelated category")}}
   });
  }finally{release()}
 }
};
globalThis.recoveryFixture=fixture;
const {POST}=await import("../app/api/internal/stripe/reconcile-pending/route.ts");
const server=createServer(async(req,res)=>{
 const base="http://127.0.0.1:"+server.address().port+"/api/internal/stripe/reconcile-pending";
 const chunks=[];for await(const c of req)chunks.push(c);
 const request=new Request(base,{method:"POST",headers:req.headers,body:Buffer.concat(chunks)});
 try{
  const out=await POST(request);
  res.writeHead(out.status,Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const url="http://127.0.0.1:"+server.address().port+"/";
const call=async token=>{
 const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:JSON.stringify({donationId})});
 return {status:r.status,body:await r.json()};
};
let passed=0;
const pass=(name)=>{passed++;console.log(JSON.stringify({name,result:"PASS"}))};
try{
 assert.equal((await call()).status,404);
 assert.equal((await call("wrong")).status,404);
 assert.equal(fixture.stripeReads,0);
 assert.equal(fixture.dbWrites,0);
 pass("privileged recovery denies guest and invalid secret before Stripe/DB work");
 const responses=await Promise.all(Array.from({length:12},()=>call(process.env.CRON_SECRET)));
 assert.ok(responses.every(r=>r.status===200),JSON.stringify(responses));
 assert.ok(responses.some(r=>r.body.status==="SETTLED"));
 assert.equal(fixture.amount,20);
 assert.equal(fixture.dbWrites,1);
 assert.ok(fixture.donation.paidAt);
 pass("12 concurrent authorized recovery calls book one financial credit and one paidAt");
 const retry=await call(process.env.CRON_SECRET);
 assert.equal(retry.body.status,"ALREADY_SETTLED");
 assert.equal(fixture.amount,20);
 assert.equal(fixture.dbWrites,1);
 pass("late authenticated recovery retry cannot duplicate income");
 console.log(JSON.stringify({summary:"INTERNAL_RECONCILIATION_HTTP_PASS",passed,providerNetworkCalls:0,financeCredits:fixture.dbWrites}));
}finally{
 await new Promise(ok=>server.close(ok));
 rmSync(dir,{recursive:true,force:true});
}
