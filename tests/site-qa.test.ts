import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { IntlMessageFormat } from 'intl-messageformat';
import { MAX_IMAGE_BYTES, validateImageFile } from '../lib/uploads/image-file-rules';
import { hasConfirmedDonationPayment } from '../lib/donations/receipt-state';

test('a missing or failed donation never becomes a paid receipt because its subscription is active', () => {
  assert.equal(hasConfirmedDonationPayment(null),false);
  assert.equal(hasConfirmedDonationPayment({status:'FAILED'}),false);
  assert.equal(hasConfirmedDonationPayment({status:'ACTIVE'}),false);
  assert.equal(hasConfirmedDonationPayment({status:'PAID'}),true);
});

test('all literal UI translation references exist and preserve Arabic ICU arguments', () => {
  execFileSync(process.execPath, ['scripts/audit-ui-translation-usage.mjs','--strict'], {stdio:'pipe'});
});
test('every message in all eight languages parses as valid ICU syntax', () => {
  const visit=(value:unknown,locale:string,path:string)=>{if(typeof value==='string')assert.doesNotThrow(()=>new IntlMessageFormat(value,locale),`${locale}:${path}`);else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))visit(v,locale,path+'.'+k);};
  for(const locale of ['ar','en','tr','fr','de','id','pt','es'])visit(JSON.parse(readFileSync(`i18n/messages/${locale}.json`,'utf8')),locale,'');
});
test('image validation accepts supported photos and refuses empty, oversized and non-image input', () => {
  assert.equal(validateImageFile({type:'image/png',size:1024}),null);
  assert.ok(validateImageFile({type:'text/html',size:1024}));
  assert.ok(validateImageFile({type:'image/png',size:0}));
  assert.ok(validateImageFile({type:'image/png',size:MAX_IMAGE_BYTES+1}));
  assert.ok(validateImageFile({type:'image/x-unknown',size:100}));
});
test('the legacy success URL never fabricates a donation and only forwards validated record IDs', async () => {
  const target={exports:{} as {default:(props:unknown)=>Promise<unknown>}},destinations:string[]=[];
  const code=ts.transpileModule(readFileSync('app/[locale]/success/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(code,{exports:target.exports,module:target,require:(name:string)=>{
    if(name==='next/navigation')return {redirect:(href:string)=>{destinations.push(href);throw new Error('redirect');}};
    if(name==='@/lib/locales')return {isValidLocale:(l:string)=>['ar','en','tr','fr','de','id','pt','es'].includes(l)};
    throw new Error('Unexpected dependency: '+name);
  }});
  const id='111111111111111111111111';
  for(const [locale,donationId,expected]of [['ar',undefined,'/ar/campaigns'],['de',id,'/de/success/'+id],['en','../../private','/en/campaigns'],['unknown',undefined,'/ar/campaigns']]){
    await assert.rejects(target.exports.default({params:Promise.resolve({locale}),searchParams:Promise.resolve({donationId})}),/redirect/);
    assert.equal(destinations.at(-1),expected);
  }
});
function uploadDeleteFixture(role:string|null){
  const destroyed:string[]=[],session=role?{user:{role}}:null;
  const result={exports:{} as {DELETE:(request:Request)=>Promise<Response>}};
  const response={json:(data:unknown,init?:ResponseInit)=>new Response(JSON.stringify(data),init)};
  const dependencies:Record<string,unknown>={
    'next/server':{NextResponse:response},'next-auth':{getServerSession:async()=>session},'../auth/[...nextauth]/options':{authOptions:{}},
    '@/lib/dashboard/api-auth':{requireAdminSession:(s:typeof session)=>!s?response.json({error:'Unauthorized'},{status:401}):s.user.role!=='ADMIN'?response.json({error:'Forbidden'},{status:403}):null},
    '@/lib/cloudinary':{uploader:{destroy:async(id:string)=>destroyed.push(id)}},
    '@/lib/audit-log':{queueAuditLog:()=>{},auditActorFromSiteSession:()=>({}),auditStreamForRole:()=>''},
    '@/lib/uploads/image-file-rules':{MAX_IMAGE_BYTES,formatBytes:()=>'',validateImageFile},
  };
  const source=ts.transpileModule(readFileSync('app/api/upload/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  runInNewContext(source,{exports:result.exports,module:result,require:(name:string)=>{assert.ok(name in dependencies,`Unexpected dependency ${name}`);return dependencies[name];},Response,URL,console,Buffer,process});
  return {destroyed,DELETE:result.exports.DELETE};
}
test('anonymous, donor and staff sessions cannot delete campaign assets',async()=>{
  for(const role of [null,'DONOR','STAFF']){const f=uploadDeleteFixture(role),r=await f.DELETE(new Request('https://example.org/api/upload?publicId=photo'));assert.equal(r.status,role?403:401);assert.deepEqual(f.destroyed,[]);}
});
test('image deletion refuses traversal and other folders, and normalizes the allowed campaign prefix',async()=>{
  const f=uploadDeleteFixture('ADMIN');
  for(const id of ['../private','campaigns/../private','avatars/photo','']){const r=await f.DELETE(new Request('https://example.org/api/upload?publicId='+encodeURIComponent(id)));assert.equal(r.status,400);}
  assert.deepEqual(f.destroyed,[]);
  for(const id of ['photo-1','campaigns/photo-2'])assert.equal((await f.DELETE(new Request('https://example.org/api/upload?publicId='+id))).status,200);
  assert.deepEqual(f.destroyed,['campaigns/photo-1','campaigns/photo-2']);
});

 test('manual donation entry checks editing permission before rendering the actual donation form', async () => {
  let allowed = false;
  const calls: string[] = [];
  const result = {exports:{} as {default:()=>Promise<unknown>}};
  const code = ts.transpileModule(readFileSync('app/(dashboard)/dashboard/donations/new/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  runInNewContext(code,{exports:result.exports,module:result,require:(name:string)=>{
    if(name==='react/jsx-runtime')return {jsx:(component:unknown)=>{calls.push('form');return component;}};
    if(name==='next-auth')return {getServerSession:async()=>({user:{role:'STAFF'}})};
    if(name==='next/navigation')return {redirect:(href:string)=>{calls.push(href);throw new Error('redirect');}};
    if(name==='@/app/api/auth/[...nextauth]/options')return {authOptions:{}};
    if(name==='@/lib/dashboard/page-access')return {resolveDashboardPageAccess:(_s:unknown,key:string)=>{assert.equal(key,'donationsEdit');return allowed?{allowed:true}:{allowed:false,redirectTo:'/dashboard'};}};
    if(name==='./NewDonation')return {NewDonation:'manual-donation-form'};
    throw new Error('Unexpected dependency '+name);
  }});
  await assert.rejects(result.exports.default(),/redirect/);
  assert.deepEqual(calls,['/dashboard']);
  allowed = true;
  assert.equal(await result.exports.default(),'manual-donation-form');
  assert.deepEqual(calls,['/dashboard','form']);
});
