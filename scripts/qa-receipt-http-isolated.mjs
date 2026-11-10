import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { registerHooks } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const donationId="aaaaaaaaaaaaaaaaaaaaaaaa", donorId="bbbbbbbbbbbbbbbbbbbbbbbb";
const otherId="cccccccccccccccccccccccc", key=Buffer.alloc(32,21);
process.env.GOZ_GUEST_PAYMENT_KEYS="qa_receipt:"+key.toString("base64url");
const dir=mkdtempSync(resolve(tmpdir(),"goz-receipt-http-"));
const stubs={
  "session.cjs":'exports.getServerSession=async()=>globalThis.receiptFixture.session;',
  "auth.cjs":'exports.authOptions={};',
  "link.cjs":'exports.linkGuestUserToTarget=async(donorId,userId)=>{globalThis.receiptFixture.links++;return {ok:true,movedDonations:1}};',
  "database.cjs":'exports.prisma={donation:{findUnique:async({where,select})=>{const f=globalThis.receiptFixture;if(where.id!==f.donation?.id)return null;f.reads++;return select?{donorId:f.donation.donorId,status:f.donation.status,paidAt:f.donation.paidAt}:structuredClone(f.donation)}}};',
  "next.cjs":'class NextResponse extends Response { static json(v,o={}){const r=Response.json(v,o);Object.setPrototypeOf(r,NextResponse.prototype);return r} get cookies(){return {set:({name,value,path,maxAge,httpOnly,sameSite})=>this.headers.append("Set-Cookie",name+"="+value+"; Path="+path+"; Max-Age="+maxAge+";"+(httpOnly?" HttpOnly;":"")+" SameSite="+sameSite)}} };exports.NextResponse=NextResponse;'
};
for(const [name,source] of Object.entries(stubs)) writeFileSync(resolve(dir,name),source);
const aliases=new Map([
 ["next-auth","session.cjs"],
 ["@/app/api/auth/[...nextauth]/options","auth.cjs"],
 ["@/lib/prisma","database.cjs"],
 ["@/lib/users/link-guest","link.cjs"],
 ["next/server","next.cjs"]
]);
registerHooks({resolve(name,ctx,next){const file=aliases.get(name);return file?{url:pathToFileURL(resolve(dir,file)).href,shortCircuit:true}:next(name,ctx)}});
globalThis.receiptFixture={session:null,reads:0,links:0,donation:{
 id:donationId,donorId,status:"PAID",paidAt:new Date("2026-11-10T12:00:00.000Z"),
 createdAt:new Date("2026-11-10T11:59:00.000Z"),amount:24.5,totalAmount:24.5,
 currency:"USD",fees:0,teamSupport:0,paymentMethod:"CARD",subscriptionId:null,subscription:null,
 donor:{name:"Synthetic Private Donor",email:"private-fixture@example.invalid",phone:"+999111222",country:null,countryName:"Fixture",city:null,region:null},
 items:[],categoryItems:[]
}};
const {issueGuestReceiptGrant,guestReceiptCookieName,issueGuestClaimGrant,guestClaimCookieName}=await import("../lib/donations/guest-payment-grant.ts");
const {GET,POST}=await import("../app/api/donations/[id]/receipt/route.ts");
const {POST:LINK}=await import("../app/api/users/link-guest/route.ts");
let receiptCookie=null;
issueGuestReceiptGrant({cookies:{set:({name,value})=>receiptCookie=name+"="+value}},donationId);
assert.ok(receiptCookie);
let claimCookie=null;
issueGuestClaimGrant({cookies:{set:({name,value,path})=>{
 assert.equal(path,"/api/users/link-guest");
 claimCookie=name+"="+value;
}}},donationId);
assert.ok(claimCookie);
const server=createServer(async(req,res)=>{
 const linkRoute=req.url?.startsWith("/api/users/link-guest")===true;
 const address="http://127.0.0.1:"+server.address().port+(linkRoute?"/api/users/link-guest":"/api/donations/"+donationId+"/receipt");
 const chunks=[];
 for await(const piece of req)chunks.push(piece);
 const body=Buffer.concat(chunks);
 const request=new Request(address,{method:req.method,headers:req.headers,
  ...(req.method==="POST"?{body:body.length?body:JSON.stringify({donationId})}:{})});
 request.nextUrl=new URL(address);
 request.cookies={get:(name)=>{
  const raw=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return raw?{value:raw.slice(name.length+1)}:undefined;
 }};
 try{
  const response=linkRoute
 ? await LINK(request)
 : await (req.method==="POST"?POST(request,{params:Promise.resolve({id:donationId})}):GET(request,{params:Promise.resolve({id:donationId})}));
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const base="http://127.0.0.1:"+server.address().port+"/";
let passed=0;
const pass=name=>{passed++;console.log(JSON.stringify({name,result:"PASS"}))};
async function call({method="GET",cookie,origin,path="/"}={}){
 const headers={};
 if(cookie)headers.cookie=cookie;
 if(origin)headers.origin=origin==="same"?base.slice(0,-1):origin;
 const r=await fetch(base.replace(/\/$/,"")+path,{method,headers,
  ...(method==="POST"?{body:JSON.stringify({donationId})}:{})});
 const bytes=Buffer.from(await r.arrayBuffer());
 return {status:r.status,bytes,headers:r.headers,body:bytes.toString("utf8")};
}
function pdf(r){
 assert.equal(r.status,200,r.body.slice(0,150));
 assert.match(r.headers.get("content-type")||"",/application\/pdf/);
 assert.match(r.headers.get("content-disposition")||"",/attachment/);
 assert.match(r.headers.get("cache-control")||"",/no-store/);
 assert.equal(r.bytes.subarray(0,5).toString(),"%PDF-");
 assert.ok(r.bytes.length>700);
}
try{
 let r=await call();
 assert.equal(r.status,404);
 assert.doesNotMatch(r.body,/Synthetic Private Donor|private-fixture|999111/);
 pass("absent cookie returns generic 404 without personal data");
 assert.equal((await call({cookie:receiptCookie+"x"})).status,404);
 const expiry=Math.floor(Date.now()/1000)-20;
 const mac=createHmac("sha256",key).update("gozbebekleri:receipt-access:v1:"+donationId+":"+expiry).digest("hex");
 const expired=guestReceiptCookieName(donationId)+"=qa_receipt."+expiry+"."+mac;
 assert.equal((await call({cookie:expired})).status,404);
 pass("expired valid HMAC and tampered signature denied");
 globalThis.receiptFixture.session={user:{id:otherId,role:"DONOR"}};
 assert.equal((await call({cookie:receiptCookie})).status,404);
 globalThis.receiptFixture.session={user:{id:otherId,role:"STAFF",dashboardPermissions:[]}};
 assert.equal((await call()).status,404);
 pass("other signed-in donor and unauthorized STAFF cannot borrow guest grant");
 globalThis.receiptFixture.session={user:{id:otherId,role:"STAFF",dashboardPermissions:["revenue"]}};
 pdf(await call());
 globalThis.receiptFixture.session={user:{id:otherId,role:"ADMIN"}};
 pdf(await call());
 globalThis.receiptFixture.session={user:{id:donorId,role:"DONOR"}};
 pdf(await call());
 globalThis.receiptFixture.session=null;
 pdf(await call({cookie:receiptCookie}));
 pass("ADMIN, authorized STAFF, owner and scoped guest download real PDF over HTTP");
 globalThis.receiptFixture.donation.paidAt=null;
 assert.equal((await call({cookie:receiptCookie})).status,409);
 globalThis.receiptFixture.donation.status="FAILED";
 assert.equal((await call({cookie:receiptCookie})).status,409);
 globalThis.receiptFixture.donation.status="PAID";
 globalThis.receiptFixture.donation.paidAt=new Date("2026-11-10T12:00:00.000Z");
 pass("PAID placeholder without paidAt and FAILED payments cannot generate receipt");
 assert.equal((await call({method:"POST",origin:"same"})).status,401);
 globalThis.receiptFixture.session={user:{id:otherId,role:"DONOR"}};
 assert.equal((await call({method:"POST",origin:"same"})).status,404);
 globalThis.receiptFixture.session={user:{id:otherId,role:"ADMIN"}};
 assert.equal((await call({method:"POST",origin:"same"})).status,404);
 pass("renewal requires cryptographically authenticated original donor, not guessed ID or admin");
 globalThis.receiptFixture.session={user:{id:donorId,role:"DONOR"}};
 assert.equal((await call({method:"POST",origin:"https://evil.invalid"})).status,403);
 assert.equal((await call({method:"POST"})).status,403);
 r=await call({method:"POST",origin:"same"});
 assert.equal(r.status,200,r.body);
 const setCookie=r.headers.get("set-cookie");
 assert.ok(setCookie?.includes("HttpOnly"));
 globalThis.receiptFixture.session=null;
 pdf(await call({cookie:setCookie.split(";")[0]}));
 pass("owner with verified session renews expired receipt grant using same-origin POST");
 globalThis.receiptFixture.session={user:{id:donorId,role:"DONOR"}};
 globalThis.receiptFixture.donation.paidAt=null;
 assert.equal((await call({method:"POST",origin:"same"})).status,409);
 pass("renewal refuses unconfirmed donation");

 globalThis.receiptFixture.donation.paidAt=new Date("2026-11-10T12:00:00.000Z");
 globalThis.receiptFixture.session={user:{id:otherId,role:"DONOR"}};
 const linkOptions={method:"POST",origin:"same",path:"/api/users/link-guest"};
 assert.equal((await call(linkOptions)).status,403);
 assert.equal((await call({...linkOptions,cookie:receiptCookie})).status,403);
 assert.equal((await call({...linkOptions,cookie:claimCookie+"x"})).status,403);
 assert.equal(globalThis.receiptFixture.links,0);
 pass("guest claiming refuses ID alone, receipt capability and invalid claim signature");
 assert.equal((await call({...linkOptions,cookie:claimCookie,origin:"https://evil.invalid"})).status,403);
 assert.equal(globalThis.receiptFixture.links,0);
 const claimed=await call({...linkOptions,cookie:claimCookie});
 assert.equal(claimed.status,200,claimed.body);
 assert.equal(globalThis.receiptFixture.links,1);
 pass("signed guest claiming with verified login and same-origin request proceeds");

 console.log(JSON.stringify({summary:"RECEIPT_HTTP_PASS",passed,providerCalls:0,database:"synthetic"}));
}finally{
 await new Promise(ok=>server.close(ok));
 rmSync(dir,{recursive:true,force:true});
}
