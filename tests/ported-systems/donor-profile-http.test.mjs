import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { registerHooks } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const stubDir=mkdtempSync(resolve(tmpdir(),'goz-profile-http-'));
const stubs={
  'prisma.cjs': 'module.exports.prisma = new Proxy({}, {get(_target,key){ return globalThis.__GOZ_FAKE?.prisma?.[key]; }});',
  'next-auth.cjs': 'module.exports.getServerSession=async()=>globalThis.__GOZ_FAKE?.session ?? null;',
  'auth-options.cjs': 'module.exports.authOptions={};',
  'badge-criteria.cjs': 'module.exports.getBadgeIdsByUser=async()=>new Map();',
  'audit-log.cjs': 'module.exports.writeAuditLog=async()=>{};',
  'api-auth.cjs': 'module.exports.requireAdminSession=()=>null;'
};
for (const [name,source] of Object.entries(stubs)) writeFileSync(resolve(stubDir,name),source);
const mappings=new Map([
 ['@/lib/prisma','prisma.cjs'],
 ['next-auth','next-auth.cjs'],
 ['@/lib/badge-criteria','badge-criteria.cjs'],
 ['@/lib/audit-log','audit-log.cjs'],
 ['@/lib/dashboard/api-auth','api-auth.cjs'],
]);
registerHooks({
 resolve(specifier,context,nextResolve) {
   const file=mappings.get(specifier) ?? (specifier.includes('auth/[...nextauth]/options')?'auth-options.cjs':null);
   return file ? {url:pathToFileURL(resolve(stubDir,file)).href,shortCircuit:true} : nextResolve(specifier,context);
 }
});
const { NextRequest } = await import('next/server');
const imported=await import('../../app/api/users/[id]/route.ts');
const getProfile=imported.GET ?? imported.default?.GET;
assert.equal(typeof getProfile,'function');
const userId='aaaaaaaaaaaaaaaaaaaaaaaa';
const otherId='bbbbbbbbbbbbbbbbbbbbbbbb';
const now=new Date('2026-11-08T12:00:00Z');
const paymentFields={
  providerRaw:{secret:'PRIVATE_GATEWAY_RESPONSE'},cardDetails:{cardNumber:'SENSITIVE_CARD'},
  accessToken:'SECRET_ACCESS',providerAuthCode:'PRIVATE_AUTH',
  providerHostRefNum:'PRIVATE_HOST_REF',providerProcReturnCode:'PRIVATE_RETURN',
  providerTxnType:'Auth',providerTxnResult:'Success',
  bankOperations:{secret:'PRIVATE_BANK'},bankOperationLock:'PRIVATE_LOCK',
  bankOperationsRevision:2,bankLastInquiry:{secret:'PRIVATE_INQUIRY'},
  reconciliationCheckedAt:now,reconciliationNextAt:now,reconciliationLeaseToken:'PRIVATE_LEASE',
  reconciliationLeaseUntil:now,paypalOrderId:'PRIVATE_ORDER',paypalCaptureId:'PRIVATE_CAPTURE',
  attribution:{client_ip:'203.0.113.19',fbp:'PRIVATE_COOKIE'},
  conversionEventsSentAt:now,conversionFailedEventsSentAt:now
};
const donation={
 id:'dddddddddddddddddddddddd',donorId:userId,status:'PAID',
 amount:12,totalAmount:15,amountUSD:15,currency:'USD',paidAt:now,createdAt:now,
 subscriptionId:null,items:[{campaignId:'cccccccccccccccccccccccc'}],
 subscription:null,...paymentFields
};
const originalUser={id:userId,email:'synthetic@example.invalid',name:'Synthetic donor',
 password:'NEVER_EXPOSE_HASH',clarityId:'PRIVATE_TRACKING_KEY',donations:[donation],
 role:'DONOR',countryCode:'TR',dashboardPermissions:[],image:null,
 _count:{donations:1},createdAt:now,updatedAt:now};
let queryCount=0;
const db={
 user:{findUnique: async args=>{
   queryCount++;
   if(args.where.id !== userId) return null;
   const copy=structuredClone(originalUser);
   const omit=args.include?.donations?.omit ?? {};
   copy.donations=copy.donations.map(d=>{
     for(const [key,enabled] of Object.entries(omit)) if(enabled) delete d[key];
     return d;
   });
   return copy;
 }},
 donation:{groupBy:async()=>[{_sum:{totalAmount:15,amountUSD:15},_max:{paidAt:now},_count:{id:1}}]},
 badge:{findMany:async()=>[]},
 subscription:{findMany:async()=>[]}
};
globalThis.__GOZ_FAKE={prisma:db,session:null};
const server=createServer(async (req,res)=>{
 try {
   const target=(req.url||'').split('/').pop()||'';
   const nextReq=new NextRequest('http://127.0.0.1'+req.url,{method:'GET'});
   const response=await getProfile(nextReq,{params:Promise.resolve({id:target})});
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));
 } catch(error){res.statusCode=500;res.end(String(error));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const call=async(id)=>{const res=await fetch(base+'/api/users/'+id); return {status:res.status,body:await res.json()};};
try {
 await test('HTTP GET without session returns 401 and never queries donor data',async()=>{
   globalThis.__GOZ_FAKE.session=null;
   queryCount=0;
   const r=await call(userId);
   assert.equal(r.status,401);
   assert.equal(queryCount,0);
 });
 await test('HTTP cross-donor access is rejected with 403 before any database read',async()=>{
   globalThis.__GOZ_FAKE.session={user:{id:otherId,role:'DONOR',dashboardPermissions:[]}};
   queryCount=0;
   const r=await call(userId);
   assert.equal(r.status,403);
   assert.equal(queryCount,0);
 });
 await test('HTTP donor response is settled and omits internal payment and tracking metadata',async()=>{
   globalThis.__GOZ_FAKE.session={user:{id:userId,role:'DONOR',dashboardPermissions:[]}};
   const r=await call(userId);
   assert.equal(r.status,200,JSON.stringify(r.body));
   assert.equal(r.body.user.totalDonationsCount,1);
   assert.equal(r.body.user.totalDonatedAmountUSD,15);
   assert.equal(r.body.user.hasPassword,true);
   assert.ok(!('password' in r.body.user));
   assert.ok(!('clarityId' in r.body.user),'tracking ID leaked');
   for(const group of [r.body.user.donations,r.body.oneTimeDonations,r.body.monthlyDonations]){
      for(const row of group){
        for(const key of Object.keys(paymentFields)) assert.ok(!(key in row),key+' leaked');
      }
   }
 });
 await test('HTTP staff without donor permission cannot read another donor',async()=>{
   globalThis.__GOZ_FAKE.session={user:{id:otherId,role:'STAFF',dashboardPermissions:['messages']}};
   queryCount=0;
   const r=await call(userId);
   assert.equal(r.status,403);
   assert.equal(queryCount,0);
 });
 await test('HTTP admin may view authorized profile and tracking link',async()=>{
   globalThis.__GOZ_FAKE.session={user:{id:otherId,role:'ADMIN',dashboardPermissions:[]}};
   const r=await call(userId);
   assert.equal(r.status,200);
   assert.equal(r.body.user.clarityId,'PRIVATE_TRACKING_KEY');
 });
} finally {
 await new Promise(r=>server.close(r));
 rmSync(stubDir,{recursive:true,force:true});
}

