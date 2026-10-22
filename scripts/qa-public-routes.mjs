/** DB-free HTTP regression of actual Next routes. No browser, production data or provider calls.
 * Streaming 404 responses may return 200 with noindex and their recovery UI in the RSC payload.
 * This checks that server contract, not client hydration or responsive layout.
 */
import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port = 3137;
const env = {...process.env, DATABASE_URL:'', INTEGRATION_DATABASE_URL:'', NEXT_TELEMETRY_DISABLED:'1', VERCEL_ENV:'development', QA_NEXT_DIST_DIR:'.next-qa-http', GOOGLE_CLIENT_ID:'qa-client.invalid', GOOGLE_CLIENT_SECRET:'qa-placeholder', NEXTAUTH_SECRET:'local-qa-placeholder-not-a-production-secret', NEXTAUTH_URL:`http://localhost:${port}`};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','localhost','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
let logs=''; child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
const request=path=>new Promise((resolve,reject)=>get(`http://localhost:${port}${path}`,res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({status:res.statusCode,body}));}).on('error',reject));
try {
  await new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(logs.includes('Ready in')){clearInterval(timer);resolve();}else if(child.exitCode!==null||Date.now()-started>45000){clearInterval(timer);reject(new Error('Next startup failed'));}},100);});
  const results=[];
  for(const locale of ['ar','en','fr','tr','de','es','pt','id']){
    const privacy=await request(`/${locale}/privacy`);assert.equal(privacy.status,200,`${locale} privacy`);
    assert.ok(!privacy.body.includes('NEXT_HTTP_ERROR_FALLBACK;500'),`${locale} privacy error`);
    const missing=await request(`/${locale}/qa-remediation-missing`);await writeFile(`/tmp/gozbebekleri-qa-missing-${locale}.html`,missing.body);assert.ok(missing.status === 404 || (missing.status === 200 && missing.body.includes('content="noindex"')), `${locale} missing status or streamed noindex`);
    assert.ok(missing.body.includes(`href="/${locale}/campaigns"`) || missing.body.replaceAll(String.fromCharCode(92), "").includes(`"href":"/${locale}/campaigns"`), `${locale} recovery link in HTML or RSC payload`);
    const terms=await request(`/${locale}/terms`);assert.equal(terms.status,200,`${locale} terms link destination`);
    const contact=await request(`/${locale}/contact-us`);assert.equal(contact.status,200,`${locale} contact`);
    for(const field of ['name','phone','email','message','messageType']){
      assert.ok(contact.body.includes(`for="contact-${field}"`),`${locale} ${field} label`);
      assert.ok(contact.body.includes(`id="contact-${field}"`),`${locale} ${field} field`);
    }
    results.push({locale,privacy:privacy.status,missing:missing.status,contact:contact.status,terms:terms.status});
  }
  console.log(JSON.stringify({passed:true,results},null,2));
} finally {
  child.kill('SIGTERM');
  await mkdir('/tmp/gozbebekleri-qa',{recursive:true});
  await writeFile('/tmp/gozbebekleri-qa/public-routes.log',logs);
}
