import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const donationId="aaaaaaaaaaaaaaaaaaaaaaaa", owner="bbbbbbbbbbbbbbbbbbbbbbbb";
const stranger="cccccccccccccccccccccccc", subscriptionId="dddddddddddddddddddddddd";
process.env.GOZ_GUEST_PAYMENT_KEYS="qa_fixture:"+Buffer.alloc(32,23).toString("base64url");
const dir=mkdtempSync(resolve(tmpdir(),"goz-donation-http-"));
const stubs={
 "auth.cjs":'exports.getServerSession=async()=>globalThis.donationFixture.session;',
 "options.cjs":'exports.authOptions={};',
 "prisma.cjs":'exports.prisma=new Proxy({}, {get(_t,k){return globalThis.donationFixture.prisma[k]}});',
 "permissions.cjs":'exports.userHasDashboardPermission=(user,name)=>user?.role==="ADMIN"||user?.dashboardPermissions?.includes(name);',
 "admin.cjs":'exports.isRevenueDashboardUser=session=>session?.user?.role==="ADMIN"||session?.user?.dashboardPermissions?.includes("revenue");',
 "exchange.cjs":'exports.convertAmountInCurrencyToUsd=async x=>x;exports.normalizeDonationCurrencyCode=x=>x;',
 "audit.cjs":'exports.writeAuditLog=async()=>{};exports.auditActorFromDashboardSession=()=>({actorRole:"ADMIN"});exports.auditActorFromSiteSession=()=>({actorRole:"DONOR"});exports.auditStreamForRole=()=>("TEAM");',
 "amount.cjs":'exports.recomputeCampaignCurrentAmount=async()=>{};exports.recomputeCategoryCurrentAmount=async()=>{};',
 "next.cjs":'exports.NextResponse={json:(body,opt={})=>Response.json(body,opt)};',
};
for(const [file,content]of Object.entries(stubs))writeFileSync(resolve(dir,file),content);
const aliases=new Map([
 ["next-auth","auth.cjs"],
 ["../../auth/[...nextauth]/options","options.cjs"],
 ["@/lib/prisma","prisma.cjs"],
 ["@/lib/dashboard/permissions","permissions.cjs"],
 ["@/lib/dashboard/api-auth","admin.cjs"],
 ["@/lib/exchange/convert-amount-in-currency-to-usd","exchange.cjs"],
 ["@/lib/audit-log","audit.cjs"],
 ["@/lib/campaign/current-amount","amount.cjs"],
 ["next/server","next.cjs"],
]);
registerHooks({resolve(specifier,context,next){
 const file=aliases.get(specifier);
 return file?{url:pathToFileURL(resolve(dir,file)).href,shortCircuit:true}:next(specifier,context);
}});
const original={
 id:donationId,donorId:owner,subscriptionId,
 amount:20,totalAmount:20,currency:"USD",status:"PAID",
 paidAt:new Date("2026-11-10T10:00:00Z"),
 createdAt:new Date("2026-11-10T09:00:00Z"),
 paymentMethod:"CARD",provider:"STRIPE",
 providerRaw:{creditCard:"PROVIDER_INTERNAL_SECRET"},
 stripeChargeAttempt:{attemptId:"PRIVATE_STRIPE_NONCE"},
 providerOrderId:"pi_secret_internal_reference",
 providerAuthCode:"INTERNAL_AUTH_CODE", providerErrorMessage:"Secret payment explanation", futureProviderPrivateField:"FUTURE_FINANCE_SECRET",
 cardDetails:{number:"4111111111111111"},
 donor:{id:owner,name:"Existing Account Donor",email:"private@example.invalid",phone:"+9991111",birthdate:"1990-01-01",image:"PRIVATE_IMAGE",gender:"private",countryCode:"TR",city:"SECRET_CITY",region:"SECRET_REGION"},
 subscription:{status:"ACTIVE",nextBillingDate:new Date("2026-12-01"),lastBillingDate:new Date("2026-11-01")},
 items:[{id:"eeeeeeeeeeeeeeeeeeeeeeee",campaignId:"ffffffffffffffffffffffff",amount:20,
 campaign:{title:"Synthetic Project",images:[],translations:[]}}],
 categoryItems:[],
};
const state={session:null,reads:0,writes:0,stripeCalls:0};
state.prisma={
 donation:{
 findUnique:async({where,select})=>{
  state.reads++;
  if(where.id!==donationId)return null;
  return select?{donorId:original.donorId}:structuredClone(original);
 },
 update:async()=>{state.writes++;throw Error("GET MUST NOT WRITE")},
 updateMany:async()=>{state.writes++;throw Error("GET MUST NOT WRITE")},
 },
 subscription:{update:async()=>{state.writes++;return{}}},
 $transaction:async()=>{state.writes++;throw Error("PUBLIC ROUTE MUST NOT SETTLE")},
 campaign:{update:async()=>{state.writes++;throw Error("NO CAMPAIGN WRITES")}},
 category:{update:async()=>{state.writes++;throw Error("NO CATEGORY WRITES")}},
};
globalThis.donationFixture=state;
const {issueGuestReceiptGrant}=await import("../lib/donations/guest-payment-grant.ts");
const {GET}=await import("../app/api/donations/[id]/route.ts");
let cookie="";
issueGuestReceiptGrant({cookies:{set:({name,value})=>cookie=name+"="+value}},donationId);
const server=createServer(async(req,res)=>{
 const url="http://127.0.0.1:"+server.address().port+"/api/donations/"+donationId;
 const chunks=[];for await(const c of req)chunks.push(c);
 const body=Buffer.concat(chunks);
 const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==="PUT"?{body}: {})});
 request.nextUrl=new URL(url);
 request.cookies={get:(name)=>{
  const found=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return found?{value:found.slice(name.length+1)}:undefined;
 }};
 try{
 const out=await GET(request,{params:Promise.resolve({id:donationId})});
 res.writeHead(out.status,Object.fromEntries(out.headers));
 res.end(Buffer.from(await out.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end(String(error))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const endpoint="http://127.0.0.1:"+server.address().port+"/api/donations/"+donationId;
let passed=0;
const pass=name=>{passed++;console.log(JSON.stringify({name,result:"PASS"}))};
async function call(method="GET",body,grant){
 const headers={};if(grant)headers.cookie=grant;
 if(method==="PUT")headers["content-type"]="application/json";
 const resp=await fetch(endpoint,{method,headers,...(method==="PUT"?{body:JSON.stringify(body)}:{})});
 const text=await resp.text();let payload;try{payload=JSON.parse(text)}catch{payload={error:text}};
 return {status:resp.status,payload,text};
}
try{
 state.session={user:{id:stranger,role:"DONOR"}};
 assert.equal((await call("GET")).status,404);
 state.session=null;
 assert.equal((await call("GET")).status,404);
 pass("HTTP GET refuses anonymous or unrelated authenticated caller without guest grant");

 x=await call("GET",undefined,cookie);
 assert.equal(x.status,200,JSON.stringify(x.payload));
 assert.deepEqual(Object.keys(x.payload).sort(),[
 "id","amount","totalAmount","currency","status","paidAt","createdAt","paymentMethod",
 "provider","subscriptionId","donor","items","categoryItems","type","paymentStatus",
 "subscriptionStatus","nextBillingDate","lastBillingDate"
 ].sort());
 assert.equal(x.payload.donor.id,null);
 assert.equal(x.payload.donor.email,null);
 for(const hidden of ["providerRaw","stripeChargeAttempt","providerOrderId","providerAuthCode","cardDetails","providerErrorMessage","donorId"]){
  assert.equal(x.payload[hidden],undefined,hidden);
 }
 assert.doesNotMatch(x.text,/Existing Account Donor|private@example|SECRET_CITY|PRIVATE_STRIPE_NONCE|PROVIDER_INTERNAL_SECRET|4111111111111111/);
 pass("HTTP GET guest allows only explicit fields and does not reveal linked donor or provider records");

 state.session={user:{id:owner,role:"DONOR"}};
 x=await call("GET");assert.equal(x.status,200);
 assert.equal(x.payload.donor.email,"private@example.invalid");
 assert.equal(x.payload.providerRaw,undefined);
 pass("HTTP GET authenticated owner sees permitted donor fields but no provider internals");
 state.session={user:{id:stranger,role:"STAFF",dashboardPermissions:[]}};
 assert.equal((await call("GET")).status,404);
 state.session={user:{id:stranger,role:"STAFF",dashboardPermissions:["revenue"]}};
 assert.equal((await call("GET")).status,200);
 state.session={user:{id:stranger,role:"STAFF",dashboardPermissions:["donationsEdit"]}};
 assert.equal((await call("GET")).status,200);
 state.session={user:{id:stranger,role:"ADMIN"}};
 assert.equal((await call("GET")).status,200);
 pass("GET role matrix: owner, non-owner, STAFF restricted/revenue/edit and ADMIN");

 state.session=null;
 const forgedCookie=cookie.replace(/.$/,"0");
 assert.equal((await call("GET",undefined,forgedCookie)).status,404);
 assert.equal((await call("GET",undefined,"goz_guest_receipt_"+donationId+"=bad")).status,404);
 pass("GET rejects tampered or malformed guest grants");


 state.session=null;
 const result=await Promise.all(Array.from({length:20},()=>call("GET",undefined,cookie)));
 assert.ok(result.every(x=>x.status===200));
 assert.equal(state.writes,0,"No financial or subscription writes across 20 concurrent public reads");
 assert.equal(state.stripeCalls,0);
 pass("20 concurrent authorized GET requests cause zero database mutations and zero Stripe calls");
 console.log(JSON.stringify({summary:"DONATION_ACCESS_HTTP_PASS",passed,readCalls:state.reads,writes:state.writes,stripeCalls:state.stripeCalls}));
} finally {
 await new Promise(ok=>server.close(ok));
 rmSync(dir,{recursive:true,force:true});
}
