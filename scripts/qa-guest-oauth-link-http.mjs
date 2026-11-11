import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
const donationId="aaaaaaaaaaaaaaaaaaaaaaaa",donorId="bbbbbbbbbbbbbbbbbbbbbbbb",userId="cccccccccccccccccccccccc";
process.env.GOZ_GUEST_PAYMENT_KEYS="oauth_fixture:"+Buffer.alloc(32,67).toString("base64url");
const tmp=mkdtempSync(resolve(tmpdir(),"goz-guest-oauth-"));
const mocks={
 "next.cjs":'exports.NextResponse={json:(body,opts={})=>Response.json(body,opts)};',
 "auth.cjs":'exports.getServerSession=async()=>globalThis.oauthFixture.session;',
 "options.cjs":'exports.authOptions={};',
 "prisma.cjs":'exports.prisma=globalThis.oauthFixture.prisma;',
 "link.cjs":'exports.linkGuestUserToTarget=async(from,to)=>{globalThis.oauthFixture.linkCalls++;return globalThis.oauthFixture.linkResult||{ok:true,movedDonations:1}};',
};
for(const [name,code] of Object.entries(mocks))writeFileSync(resolve(tmp,name),code);
const aliases=new Map([
 ["next/server","next.cjs"],["next-auth","auth.cjs"],
 ["@/app/api/auth/[...nextauth]/options","options.cjs"],
 ["@/lib/prisma","prisma.cjs"],
 ["@/lib/users/link-guest","link.cjs"],
]);
registerHooks({resolve(spec,ctx,next){const name=aliases.get(spec);return name?{url:pathToFileURL(resolve(tmp,name)).href,shortCircuit:true}:next(spec,ctx)}});
const f={session:null,linkCalls:0,linkResult:null,readCalls:0,
 prisma:{donation:{findUnique:async({where})=>{f.readCalls++;return where.id===donationId?{donorId}:null}}}};
globalThis.oauthFixture=f;
const {issueGuestClaimGrant,guestClaimCookieName}=await import("../lib/donations/guest-payment-grant.ts");
const {POST}=await import("../app/api/users/link-guest/route.ts");
let guestCookie=null;
issueGuestClaimGrant({cookies:{set:(cookie)=>{guestCookie=cookie}}},donationId);
async function send({session=null,origin="https://fixture.invalid",cookie=null,id=donationId}={}){
 f.session=session;
 const req=new Request("https://fixture.invalid/api/users/link-guest",{
  method:"POST",headers:{"content-type":"application/json",...(origin?{origin}:{})},
  body:JSON.stringify({donationId:id}),
 });
 req.nextUrl=new URL(req.url);
 req.cookies={get:(key)=>cookie?.name===key?{value:cookie.value}:undefined};
 const response=await POST(req);
 return {status:response.status,body:await response.json()};
}
let passed=0;
try {
 assert.equal((await send()).status,401);passed++;
 const session={user:{id:userId,role:"DONOR"}};
 assert.equal((await send({session,origin:null,cookie:guestCookie})).status,403);passed++;
 assert.equal((await send({session,origin:"https://malicious.invalid",cookie:guestCookie})).status,403);passed++;
 assert.equal((await send({session})).status,403);passed++;
 assert.equal(f.linkCalls,0);passed++;
 const linked=await send({session,cookie:guestCookie});
 assert.equal(linked.status,200,JSON.stringify(linked.body));
 assert.equal(linked.body.movedDonations,1);assert.equal(f.linkCalls,1);passed++;
 assert.equal((await send({session,cookie:guestCookie,id:"dddddddddddddddddddddddd"})).status,403);passed++;
 f.linkResult={ok:false,reason:"GUEST_NOT_ELIGIBLE"};
 assert.equal((await send({session,cookie:guestCookie})).status,409);passed++;
 assert.equal(guestCookie.name,guestClaimCookieName(donationId));passed++;
 console.log(JSON.stringify({summary:"GUEST_OAUTH_LINK_HTTP_PASS",passed,linkedCalls:f.linkCalls,realDatabaseCalls:0}));
}finally{rmSync(tmp,{recursive:true,force:true})}
