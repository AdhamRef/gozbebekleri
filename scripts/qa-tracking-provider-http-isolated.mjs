import assert from "node:assert/strict";
import {createServer} from "node:http";
import {registerHooks} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const root=mkdtempSync(resolve(tmpdir(),"goz-tracking-issue215-"));
let databaseRow=null, auditCount=0, writes=0, user=null;
const fixture={
  prisma:{
    $runCommandRaw:async command=>{
      if(command.find==="TrackingSettings"){
        return {cursor:{firstBatch:databaseRow?[structuredClone(databaseRow)]:[]}};
      }
      if(command.insert==="TrackingSettings"){
        writes++;
        databaseRow={_id:"aaaaaaaaaaaaaaaaaaaaaaaa",...command.documents[0]};
        return {ok:1,n:1};
      }
      if(command.update==="TrackingSettings"){
        writes++;
        const op=command.updates[0].u;
        Object.assign(databaseRow,op.$set||{});
        for(const key of Object.keys(op.$unset||{}))delete databaseRow[key];
        return {ok:1,n:1};
      }
      throw Error("Unexpected database command");
    },
    marketingPlatformConnection:{findMany:async()=>[]}
  },
  session:()=>user,
  audit:async()=>{auditCount++}
};
globalThis.trackingFixture=fixture;
const stubs={
  "db.cjs":'exports.prisma=globalThis.trackingFixture.prisma;',
  "auth.cjs":'exports.getServerSession=async()=>globalThis.trackingFixture.session();',
  "options.cjs":'exports.authOptions={};',
  "guard.cjs":'exports.requireAdminOrDashboardPermission=(session,permission)=>!session?.user?Response.json({error:"Unauthorized"},{status:401}):session.user.role==="ADMIN"||session.user.dashboardPermissions?.includes(permission)?null:Response.json({error:"Forbidden"},{status:403});',
  "audit.cjs":'exports.auditActorFromDashboardSession=(s)=>({actorId:s.user.id,actorName:"QA Operator",actorRole:s.user.role});exports.writeAuditLog=globalThis.trackingFixture.audit;',
  "raw.cjs":'exports.rawCommand=x=>x;',
  "crypto.cjs":'exports.integrationEncryptionKeyIsConfigured=()=>false;exports.encryptIntegrationSecret=()=>{throw Error("Unexpected encryption")};',
  "ga.cjs":'exports.parseGa4ServiceAccountJson=()=>null;',
  "next.cjs":'exports.NextResponse={json:(body,init={})=>Response.json(body,init)};'
};
for(const [name,source] of Object.entries(stubs))writeFileSync(resolve(root,name),source);
const aliases=new Map([
  ["@/lib/prisma","db.cjs"],["next-auth","auth.cjs"],
  ["@/app/api/auth/[...nextauth]/options","options.cjs"],
  ["@/lib/dashboard/api-auth","guard.cjs"],
  ["@/lib/audit-log","audit.cjs"],
  ["@/lib/prisma-raw-command","raw.cjs"],
  ["@/lib/integration-settings/crypto","crypto.cjs"],
  ["@/lib/marketing/ga4-reporting","ga.cjs"],
  ["next/server","next.cjs"]
]);
registerHooks({resolve(spec,ctx,next){
 const file=aliases.get(spec);
 return file?{url:pathToFileURL(resolve(root,file)).href,shortCircuit:true}:next(spec,ctx);
}});
const admin=await import("../app/api/admin/tracking/route.ts");
const publicRoute=await import("../app/api/tracking/config/route.ts");
const server=createServer(async(req,res)=>{
  const isPublic=req.url==="/api/tracking/config";
  const url="http://127.0.0.1:"+server.address().port+req.url;
  const parts=[];for await(const part of req)parts.push(part);
  const request=new Request(url,{method:req.method,headers:req.headers,
    ...(req.method==="PUT"?{body:Buffer.concat(parts)}:{})});
  try{
    const response=isPublic?await publicRoute.GET():req.method==="PUT"?await admin.PUT(request):await admin.GET();
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port;
async function call(path,method="GET",body){
  const res=await fetch(origin+path,{method,headers:{"content-type":"application/json"},
    ...(method==="PUT"?{body:JSON.stringify(body)}:{})});
  return {status:res.status,body:await res.json()};
}
const url="/api/admin/tracking";
let passed=0;
const pass=(name)=>{passed++;console.log(JSON.stringify({name,result:"PASS"}))};
try{
  assert.equal((await call(url)).status,401);
  assert.equal((await call(url,"PUT",{clarityEnabled:false})).status,401);
  user={user:{id:"bbbbbbbbbbbbbbbbbbbbbbbb",role:"STAFF",dashboardPermissions:[]}};
  assert.equal((await call(url)).status,403);
  assert.equal((await call(url,"PUT",{clarityEnabled:false})).status,403);
  assert.equal(writes,0);
  pass("API denies guest/STAFF with no read or edit permissions before Mongo writes");

  user={user:{id:"bbbbbbbbbbbbbbbbbbbbbbbb",role:"STAFF",dashboardPermissions:["platformConnections"]}};
  assert.equal((await call(url)).status,200);
  assert.equal((await call(url,"PUT",{clarityEnabled:false})).status,403);
  pass("STAFF with read-only tracking access cannot save IDs");

  user={user:{id:"cccccccccccccccccccccccc",role:"ADMIN"}};
  const initial=await call(url);
  assert.equal(initial.status,200);
  assert.equal(initial.body.clarityProjectId,"u614k028k2");
  assert.equal(initial.body.googleTagManagerId,"GTM-MMNBQQWB");
  pass("migration preserves currently executing legacy Clarity and GTM IDs");

  for(const invalid of ["<script>alert(1)</script>","https://example.invalid/clarity","x onload=evil()"]){
    const r=await call(url,"PUT",{clarityProjectId:invalid,clarityEnabled:true});
    assert.equal(r.status,400);
    assert.equal(writes,0);
  }
  assert.equal((await call(url,"PUT",{googleTagManagerId:"<img onerror=alert(1)>",googleTagManagerEnabled:true})).status,400);
  assert.equal((await call(url,"PUT",{clarityEnabled:"yes"})).status,400);
  pass("server rejects JavaScript, HTML, URLs, invalid GTM ID and nonboolean toggle");

  const saved=await call(url,"PUT",{
    clarityProjectId:"qa123456",clarityEnabled:true,
    googleTagManagerId:"gtm-qa1234",googleTagManagerEnabled:true,
  });
  assert.equal(saved.status,200,JSON.stringify(saved));
  assert.equal(saved.body.clarityProjectId,"qa123456");
  assert.equal(saved.body.googleTagManagerId,"GTM-QA1234");
  assert.equal(saved.body.clarityConfigurationStatus,"configured");
  assert.equal(saved.body.clarityVerificationStatus,"not_verified");
  assert.equal(writes,1);
  assert.equal(auditCount,1);
  pass("ADMIN save persists runtime IDs and audit without pretending provider connectivity");

  const reloaded=await call(url);
  assert.equal(reloaded.body.clarityProjectId,"qa123456");
  assert.equal(reloaded.body.googleTagManagerId,"GTM-QA1234");
  assert.equal(reloaded.body.clarityEnabled,true);
  const publicConfig=await call("/api/tracking/config");
  assert.equal(publicConfig.body.clarityProjectId,"qa123456");
  assert.equal(publicConfig.body.googleTagManagerId,"GTM-QA1234");
  assert.equal(publicConfig.body.clarityEnabled,true);
  assert.equal(publicConfig.body.googleTagManagerEnabled,true);
  for(const secret of ["facebookAccessToken","gaApiSecret","gaServiceAccountEncrypted"]){
    assert.equal(publicConfig.body[secret],undefined);
  }
  pass("save -> reload -> public runtime config remains persisted and excludes secrets");

  const disabled=await call(url,"PUT",{clarityEnabled:false,googleTagManagerEnabled:false});
  assert.equal(disabled.status,200);
  assert.equal(disabled.body.clarityEnabled,false);
  assert.equal(disabled.body.googleTagManagerEnabled,false);
  assert.equal(disabled.body.clarityProjectId,"qa123456");
  const afterDisable=await call("/api/tracking/config");
  assert.equal(afterDisable.body.clarityEnabled,false);
  assert.equal(afterDisable.body.googleTagManagerEnabled,false);
  assert.equal(afterDisable.body.googleTagManagerId,null);
  assert.equal(writes,2);
  pass("explicit disabling persists and stops runtime scripts without losing stored IDs");
  console.log(JSON.stringify({summary:"TRACKING_ISSUE215_HTTP_PASS",passed,writes,auditCount,remoteProviderCalls:0}));
}finally{
 await new Promise(ok=>server.close(ok));
 rmSync(root,{recursive:true,force:true});
}
