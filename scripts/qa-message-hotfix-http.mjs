import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
const root=mkdtempSync(resolve(tmpdir(),"goz-message-hotfix-"));
let session=null,writes=0,audits=0,last=null,crash=false;
const fixture={session:()=>session,prisma:{
 message:{create:async ({data})=>{if(crash)throw Error("INTERNAL_MONGO_SECRET_MARKER");writes++;last=data;return{id:"synthetic-message-id"}}}
},audit:async()=>{audits++}};
globalThis.messageFixture=fixture;
const stubs={
 "auth.cjs":'exports.getServerSession=async()=>globalThis.messageFixture.session();',
 "options.cjs":'exports.authOptions={};',
 "prisma.cjs":'exports.prisma=globalThis.messageFixture.prisma;',
 "locale.cjs":'exports.isValidLocale=(v)=>["ar","en","tr","fr"].includes(v);',
 "blocked.cjs":'exports.BLOCKED_EMAIL_ERROR="EMAIL_NOT_ALLOWED";exports.isBlockedEmail=(v)=>typeof v==="string"&&/(^|\\.)example\\.(com|org|net)$/i.test(v.split("@").pop()||"");',
 "audit.cjs":'exports.writeAuditLog=globalThis.messageFixture.audit;exports.auditActorFromSiteSession=()=>({actorName:"QA Test",actorRole:"DONOR"});',
 "next.cjs":'exports.NextResponse={json:(data,opts={})=>Response.json(data,opts)};'
};
const aliases=new Map([
 ["next-auth","auth.cjs"],["../auth/[...nextauth]/options","options.cjs"],
 ["@/lib/prisma","prisma.cjs"],["@/lib/locales","locale.cjs"],
 ["@/lib/security/blocked-emails","blocked.cjs"],["@/lib/audit-log","audit.cjs"],
 ["next/server","next.cjs"]
]);
for(const [name,code] of Object.entries(stubs))writeFileSync(resolve(root,name),code);
registerHooks({resolve(spec,ctx,next){const file=aliases.get(spec);return file?{url:pathToFileURL(resolve(root,file)).href,shortCircuit:true}:next(spec,ctx)}});
const {POST}=await import("../app/api/messages/route.ts");
const server=createServer(async(req,res)=>{
 const data=[];for await(const chunk of req)data.push(chunk);
 const request=new Request("http://127.0.0.1:"+server.address().port+"/api/messages",{method:"POST",headers:req.headers,body:Buffer.concat(data)});
 try{const response=await POST(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
 catch(e){res.writeHead(500);res.end("Unexpected route throw");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const target="http://127.0.0.1:"+server.address().port+"/api/messages";
async function send(body){const r=await fetch(target,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}}
let pass=0;
try {
 const data={body:"Synthetic inquiry only",locale:"tr",subject:"PARTNERSHIP",contactPhone:"+900000000000",guestEmail:"nobody@fixture.invalid"};
 assert.equal((await send(data)).status,401);assert.equal(writes,0);pass++;
 session={user:{id:"donor-qa",email:"a@example.org",role:"DONOR"}};
 const blockedSession=await send(data);assert.equal(blockedSession.status,403);assert.equal(blockedSession.body.error,"EMAIL_NOT_ALLOWED");assert.equal(writes,0);pass++;
 session={user:{id:"donor-qa",email:"donor@fixture.invalid",role:"DONOR"}};
 const blockedBody=await send({...data,guestEmail:"fake@example.com"});assert.equal(blockedBody.status,403);assert.equal(writes,0);pass++;
 assert.equal((await send({...data,body:"x"})).status,400);assert.equal(writes,0);pass++;
 const successful=await send(data);assert.equal(successful.status,200);
 assert.deepEqual(successful.body,{success:true,id:"synthetic-message-id"});
 assert.equal(last.locale,"tr");assert.equal(last.subject,"PARTNERSHIP");
 assert.equal(last.userId,"donor-qa");assert.equal(last.contactPhone,"+900000000000");
 assert.equal(writes,1);assert.equal(audits,1);pass++;
 const fallback=await send({...data,locale:"xx",subject:"BYPASS"});
 assert.equal(fallback.status,200);assert.equal(last.locale,"ar");assert.equal(last.subject,"GENERAL");
 assert.equal(writes,2);assert.equal(audits,2);pass++;
 crash=true;
 const failed=await send(data);assert.equal(failed.status,500);
 assert.deepEqual(failed.body,{error:"Failed to send message"});
 assert.equal(writes,2);assert.equal(audits,2);pass++;
 console.log(JSON.stringify({summary:"MESSAGE_HOTFIX_HTTP_PASS",pass,writes,audits,realDatabaseCalls:0,realEmailSends:0}));
}finally{await new Promise(done=>server.close(done));rmSync(root,{recursive:true,force:true})}
