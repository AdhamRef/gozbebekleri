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
 "audit.cjs":'exports.writeAuditLog=async()=>{};exports.auditActorFromDashboardSession=()=>({actorRole:"ADMIN"});exports.auditActorFromSiteSession=()=>({actorRole:"DONOR"});exports.auditStreamForRole=()=>("TEAM");',
 "amount.cjs":'exports.recomputeCampaignCurrentAmount=async()=>{};exports.recomputeCategoryCurrentAmount=async()=>{};',
 "stripe.cjs":'module.exports=class Stripe{constructor(){this.paymentIntents={retrieve:async()=>{throw Error("Unexpected Stripe call")}}}};',
 "events.cjs":'exports.dispatchDonationPaid=async()=>{};',
 "next.cjs":'exports.NextResponse={json:(data,options={})=>Response.json(data,options)};exports.after=()=>{};',
};
for(const [file,source] of Object.entries(modules))writeFileSync(resolve(dir,file),source);
registerHooks({resolve(spec,ctx,next){const file=aliases.get(spec);return file?{url:pathToFileURL(resolve(dir,file)).href,shortCircuit:true}:next(spec,ctx)}});
let writes=0, reads=0, failRead=false;
const donation={
 id,donorId:owner,subscriptionId:"dddddddddddddddddddddddd",status:"PAID",
 subscription:{id:"dddddddddddddddddddddddd",status:"ACTIVE",nextBillingDate:null,lastBillingDate:null},
 amount:20,totalAmount:20,currency:"USD",items:[],categoryItems:[],paidAt:new Date(),
};
globalThis.fixture={session:null,prisma:{
 donation:{findUnique:async({where})=>{reads++;if(failRead)throw Error("MONGO_SECRET_INTERNAL_FINANCIAL_MARKER");return where.id===id?structuredClone(donation):null;},
 update:async()=>{writes++;throw Error("Unexpected mutation")}},
 subscription:{update:async()=>{writes++;return{}}},
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
 console.log(JSON.stringify({summary:"DONATION_PUT_HOTFIX_HTTP_PASS",passed,writes}));
}finally{
 await new Promise(ok=>server.close(ok));
 rmSync(dir,{recursive:true,force:true});
}
