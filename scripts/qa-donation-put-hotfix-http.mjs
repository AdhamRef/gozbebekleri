import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
const id="aaaaaaaaaaaaaaaaaaaaaaaa",owner="bbbbbbbbbbbbbbbbbbbbbbbb",stranger="cccccccccccccccccccccccc";
const dir=mkdtempSync(resolve(tmpdir(),"goz-put-hotfix-"));
const aliases=new Map([
 ["next-auth","auth.cjs"],["../../auth/[...nextauth]/options","options.cjs"],
 ["@/lib/prisma","prisma.cjs"],["@/lib/dashboard/permissions","permission.cjs"],
 ["@/lib/dashboard/api-auth","admin.cjs"],
 ["@/lib/exchange/convert-amount-in-currency-to-usd","exchange.cjs"],
 ["@/lib/audit-log","audit.cjs"],["@/lib/campaign/current-amount","amount.cjs"],
 ["stripe","stripe.cjs"],["next/server","next.cjs"],
 ["@/lib/events/dispatch","events.cjs"],
]);
const modules={
 "auth.cjs":'exports.getServerSession=async()=>globalThis.fixture.session;',
 "options.cjs":'exports.authOptions={};',
 "prisma.cjs":'exports.prisma=new Proxy({}, {get(_t,k){return globalThis.fixture.prisma[k]}});',
 "permission.cjs":'exports.userHasDashboardPermission=(u,p)=>u?.role==="ADMIN"||u?.dashboardPermissions?.includes(p);',
 "admin.cjs":'exports.isRevenueDashboardUser=s=>s?.user?.role==="ADMIN"||s?.user?.dashboardPermissions?.includes("revenue");',
 "exchange.cjs":'exports.convertAmountInCurrencyToUsd=async x=>x;exports.normalizeDonationCurrencyCode=x=>x;',
 "audit.cjs":'exports.writeAuditLog=async()=>{if(globalThis.fixture.failAudit)throw Error("INTERNAL_AUDIT_SECRET_MARKER")};exports.auditActorFromDashboardSession=()=>({actorRole:"ADMIN"});exports.auditActorFromSiteSession=()=>({actorRole:"DONOR"});exports.auditStreamForRole=()=>("TEAM");',
 "amount.cjs":'exports.recomputeCampaignCurrentAmount=async()=>{};exports.recomputeCategoryCurrentAmount=async()=>{};',
 "stripe.cjs":'module.exports=class Stripe{constructor(){this.paymentIntents={retrieve:async()=>{throw Error("Unexpected Stripe call")}}}};',
 "events.cjs":'exports.dispatchDonationPaid=async()=>{};',
 "next.cjs":'exports.NextResponse={json:(data,options={})=>Response.json(data,options)};exports.after=()=>{};',
};
for(const [file,source] of Object.entries(modules))writeFileSync(resolve(dir,file),source);
registerHooks({resolve(spec,ctx,next){const file=aliases.get(spec);return file?{url:pathToFileURL(resolve(dir,file)).href,shortCircuit:true}:next(spec,ctx)}});
let writes=0, reads=0, failRead=false, failPostUpdate=false, readFailAfter=Infinity;
const donation={
 id,donorId:owner,subscriptionId:"dddddddddddddddddddddddd",status:"PAID",
 subscription:{id:"dddddddddddddddddddddddd",status:"ACTIVE",nextBillingDate:null,lastBillingDate:null},
 amount:20,totalAmount:20,currency:"USD",items:[],categoryItems:[],paidAt:new Date(),futurePrivateField:"SHOULD_NOT_APPEAR_IN_API",providerRaw:"STRIPE_INTERNAL_SECRET",donor:{name:"Test",email:"test@fixture.invalid",futurePrivateField:"DONOR_INTERNAL_SECRET"},
};
globalThis.fixture={session:null,failAudit:false,prisma:{
 donation:{findUnique:async({where})=>{reads++;if(failRead||(failPostUpdate&&reads>readFailAfter))throw Error("MONGO_SECRET_INTERNAL_FINANCIAL_MARKER");return where.id===id?structuredClone(donation):null;},
 update:async()=>{writes++;throw Error("Unexpected mutation")}},
 subscription:{updateMany:async({where,data})=>{if(donation.subscription.status!==where.status)return{count:0};writes++;donation.subscription.status=data.status;return{count:1}}},
 $transaction:async()=>{writes++;throw Error("Unexpected transaction")},
}};
const {PUT}=await import("../app/api/donations/[id]/route.ts");
const server=createServer(async(req,res)=>{
 const url="http://127.0.0.1:"+server.address().port+"/api/donations/"+id;
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const request=new Request(url,{method:"PUT",headers:req.headers,body:Buffer.concat(chunks)});
 try{
  const r=await PUT(request,{params:Promise.resolve({id})});
  res.writeHead(r.status,Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const target="http://127.0.0.1:"+server.address().port+"/api/donations/"+id;
let passed=0;
async function put(data){
 const r=await fetch(target,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
 return {status:r.status,text:await r.text()};
}
try{
 globalThis.fixture.session={user:{id:stranger,role:"DONOR"}};
 for(const body of [{},{status:"ACTIVE"},{status:"PAUSED"}]){
  const r=await put(body);
  assert.equal(r.status,403,r.text);
  assert.doesNotMatch(r.text,/dddddddddddd|nextBillingDate|totalAmount|donor|subscription/);
  assert.equal(writes,0);
  passed++;
 }
 globalThis.fixture.session=null;
 assert.equal((await put({})).status,401);passed++;
 globalThis.fixture.session={user:{id:owner,role:"DONOR"}};
 assert.equal((await put({})).status,200);passed++;
 globalThis.fixture.session={user:{id:stranger,role:"STAFF",dashboardPermissions:[]}};
 for(const body of [{},{status:"ACTIVE"}]){
  const result=await put(body);
  assert.equal(result.status,403,result.text);
  assert.doesNotMatch(result.text,/nextBillingDate|totalAmount|dddddddddddd|donor|subscription/);
  assert.equal(writes,0);passed++;
 }
 globalThis.fixture.session={user:{id:stranger,role:"DONOR",dashboardPermissions:[]}};
 assert.equal((await put({status:"CANCELLED"})).status,403);
 assert.equal(writes,0);passed++;
 globalThis.fixture.session={user:{id:owner,role:"DONOR"}};
 assert.equal((await put({status:"CANCELLED"})).status,403);
 assert.equal(writes,0);passed++;
 globalThis.fixture.session={user:{id:stranger,role:"STAFF",dashboardPermissions:["revenue"]}};
 assert.equal((await put({})).status,200);passed++;
 globalThis.fixture.session={user:{id:stranger,role:"ADMIN"}};
 assert.equal((await put({})).status,200);passed++;
 // Reject unauthenticated requests before any database read or write.
 globalThis.fixture.session=null;
 const beforeGuestReads=reads;
 for(const body of [{},{status:"ACTIVE"},{status:"CANCELLED"}]){
  const r=await put(body);
  assert.equal(r.status,401,r.text);assert.equal(reads,beforeGuestReads);assert.equal(writes,0);passed++;
 }
 // All status variants are denied before revealing subscription metadata.
 globalThis.fixture.session={user:{id:stranger,role:"DONOR"}};
 for(const body of [{status:"CANCELLED"},{status:"INVALID"},{status:"ACTIVE"},{status:"PAUSED"},{notAStatus:"oops"}]){
  const r=await put(body);assert.equal(r.status,403,r.text);
  assert.equal(r.text.includes("MONGO_SECRET_INTERNAL_FINANCIAL_MARKER"),false);
  assert.equal(writes,0);passed++;
 }
 // Authorized owners see a safe validation response; no writes for malformed data.
 globalThis.fixture.session={user:{id:owner,role:"DONOR"}};
 for(const body of [{status:"INVALID"},{status:null},{status:123}]){
  const r=await put(body);assert.equal(r.status,400,r.text);assert.equal(writes,0);passed++;
 }
 // Unrelated, one-time donations must not disclose details before authorization.
 donation.subscriptionId=null; donation.subscription=null;
 globalThis.fixture.session={user:{id:stranger,role:"DONOR"}};
 for(const body of [{},{status:"ACTIVE"}]){
  const r=await put(body);assert.equal(r.status,403,r.text);
  assert.doesNotMatch(r.text,/one-time|subscription|totalAmount|dddddddddddd|donor/);
  assert.equal(writes,0);passed++;
 }
 globalThis.fixture.session={user:{id:owner,role:"DONOR"}};
 assert.equal((await put({})).status,400);assert.equal(writes,0);passed++;
 donation.subscriptionId="dddddddddddddddddddddddd";
 donation.subscription={id:"dddddddddddddddddddddddd",status:"ACTIVE",nextBillingDate:null,lastBillingDate:null};
 // Database exception is not reflected back in HTTP JSON.
 failRead=true;
 const failed=await put({});
 assert.equal(failed.status,500,failed.text);
 assert.doesNotMatch(failed.text,/MONGO_SECRET_INTERNAL_FINANCIAL_MARKER|stack|details|dddddddddddd/);
 assert.equal(writes,0);passed++;
 failRead=false;
 // "revenue" permits reading but must never implicitly grant mutation.
 globalThis.fixture.session={user:{id:stranger,role:"STAFF",dashboardPermissions:["revenue"]}};
 for(const status of ["ACTIVE","PAUSED","CANCELLED"]){
  const r=await put({status});assert.equal(r.status,403,r.text);
  assert.equal(writes,0);passed++;
 }
 // Explicit edit privilege can pause but cannot cancel a subscription.
 globalThis.fixture.session={user:{id:stranger,role:"STAFF",dashboardPermissions:["donationsEdit"]}};
 const staffRead=await put({});assert.equal(staffRead.status,200,staffRead.text);passed++;
 assert.equal((await put({status:"CANCELLED"})).status,403);
 assert.equal(writes,0);passed++;
 assert.equal((await put({status:"PAUSED"})).status,200);
 assert.equal(writes,1);passed++;
 // Owner can resume a subscription but never cancel it.
 globalThis.fixture.session={user:{id:owner,role:"DONOR"}};
 assert.equal((await put({status:"ACTIVE"})).status,200);
 assert.equal(writes,2);passed++;
 // ADMIN remains the only role able to cancel.
 globalThis.fixture.session={user:{id:stranger,role:"ADMIN"}};
 assert.equal((await put({status:"CANCELLED"})).status,200);
 assert.equal(writes,3);passed++;
 // Future Prisma fields must never leak from the normal read or write responses.
 donation.subscription.status="ACTIVE";
 const secured=await put({});
 assert.equal(secured.status,200,secured.text);
 assert.doesNotMatch(secured.text,/SHOULD_NOT_APPEAR_IN_API|STRIPE_INTERNAL_SECRET|DONOR_INTERNAL_SECRET/);passed++;
 // A committed update must not become an unsafe 500 if audit persistence fails.
 globalThis.fixture.failAudit=true;
 const beforeAuditWrites=writes;
 const auditFailure=await put({status:"PAUSED"});
 assert.equal(auditFailure.status,200,auditFailure.text);
 assert.equal(writes,beforeAuditWrites+1);
 assert.doesNotMatch(auditFailure.text,/INTERNAL_AUDIT_SECRET_MARKER|STRIPE_INTERNAL_SECRET/);passed++;
 globalThis.fixture.failAudit=false;
 // Replaying an identical status is safe and must not create another write.
 assert.equal((await put({status:"PAUSED"})).status,200);
 assert.equal(writes,beforeAuditWrites+1);passed++;
 // Simulate database failure specifically AFTER the subscription update.
 readFailAfter=reads+1;failPostUpdate=true;
 const beforeReloadWrites=writes;
 const reloadFailure=await put({status:"ACTIVE"});
 assert.equal(reloadFailure.status,200,reloadFailure.text);
 assert.equal(writes,beforeReloadWrites+1);
 assert.doesNotMatch(reloadFailure.text,/MONGO_SECRET_INTERNAL_FINANCIAL_MARKER|SHOULD_NOT_APPEAR_IN_API/);passed++;
 failPostUpdate=false;
 assert.equal((await put({status:"ACTIVE"})).status,200);
 assert.equal(writes,beforeReloadWrites+1);passed++;
 // Multiple identical concurrent requests must not mutate more than once.
 globalThis.fixture.session={user:{id:owner,role:"DONOR"}};
 donation.subscription.status="ACTIVE";
 const beforeConcurrentWrites=writes;
 const simultaneous=await Promise.all(Array.from({length:16},()=>put({status:"PAUSED"})));
 assert.ok(simultaneous.every(r=>[200,409].includes(r.status)),JSON.stringify(simultaneous));
 assert.equal(writes,beforeConcurrentWrites+1);passed++;
 // Another change with stale subscription state may return 409; retry requires GET refresh.
 assert.equal((await put({status:"PAUSED"})).status,200);
 assert.equal(writes,beforeConcurrentWrites+1);passed++;
 console.log(JSON.stringify({summary:"DONATION_PUT_HOTFIX_HTTP_PASS",passed,authorizedWrites:writes,unauthorizedWrites:0}));
}finally{
 await new Promise(ok=>server.close(ok));
 rmSync(dir,{recursive:true,force:true});
}
