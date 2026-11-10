import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

process.env.NEXTAUTH_SECRET = "isolated-nextauth-key-must-not-sign-payment-grants";
process.env.GOZ_GUEST_PAYMENT_KEYS = "k1:" + Buffer.alloc(32, 11).toString("base64url");
process.env.STRIPE_SECRET_KEY = "sk_test_fake_no_network";
const dir = mkdtempSync(resolve(tmpdir(), "goz-guest-charge-http-"));
const stubs = {
  "auth.cjs": 'exports.getServerSession=async()=>globalThis.fixture.session;',
  "options.cjs": 'exports.authOptions={};',
  "budget.cjs": 'exports.enforcePaymentInitiationBudget=async()=>null;',
  "db.cjs": 'exports.prisma=new Proxy({}, {get(_t,k){return globalThis.fixture.prisma[k]}});',
  "next.cjs": 'exports.NextResponse={json:(x,opt={})=>Response.json(x,{status:opt.status||200,headers:opt.headers})};',
  "stripe.cjs": 'module.exports=class Stripe{constructor(){this.paymentIntents={create:async(input,opts)=>globalThis.fixture.create(input,opts),retrieve:async(id)=>globalThis.fixture.retrieve(id),search:async(q)=>globalThis.fixture.search(q)}}}'
};
for (const [name, text] of Object.entries(stubs)) writeFileSync(resolve(dir, name), text);
const aliases = new Map([
  ["next-auth", "auth.cjs"],
  ["@/app/api/auth/[...nextauth]/options", "options.cjs"],
  ["@/lib/site-security/payment-initiation-budget", "budget.cjs"],
  ["@/lib/prisma", "db.cjs"],
  ["next/server", "next.cjs"],
  ["stripe", "stripe.cjs"],
]);
registerHooks({resolve(specifier,context,next) {
  const filename = aliases.get(specifier);
  return filename
    ? {url:pathToFileURL(resolve(dir,filename)).href,shortCircuit:true}
    : next(specifier,context);
}});
const donationId="aaaaaaaaaaaaaaaaaaaaaaaa", otherId="bbbbbbbbbbbbbbbbbbbbbbbb";
const donorId="cccccccccccccccccccccccc";
const row = () => ({
  id:donationId,donorId,status:"PAID",paymentMethod:"CARD",currency:"USD",
  amount:25,totalAmount:25,provider:null,providerOrderId:null,
  subscriptionId:null,paidAt:null,locale:"ar",
  items:[{campaignId:"dddddddddddddddddddddddd",campaign:{title:"Synthetic cause"}}],
  categoryItems:[]
});
let stored = row(), creates=0, retrievals=0, lastCreated=null, stripeSearch=[];
globalThis.fixture = {
  session:null,prisma:{
    donation:{
      findUnique:async({where})=>where.id===donationId?structuredClone(stored):null,
      updateMany:async({where,data})=>{
        // The isolated emulator checks the CAS identity and provider reference.
        // Real MongoDB atomicity is exercised in the separate signed HTTP suite.
        const fields=where.AND||[];
        const claim=fields.find(x=>x.id===donationId);
        if(!claim || (claim.providerOrderId!==undefined && claim.providerOrderId!==stored.providerOrderId) ||
           (stored.paidAt!==null && stored.paidAt!==undefined) ||
           (claim.status && claim.status!==stored.status) ||
           (claim.provider && claim.provider!==stored.provider) ||
           (fields.some(x=>x.OR?.some(y=>y.providerOrderId===null)) && stored.providerOrderId!==null)) {
          return {count:0};
        }
        Object.assign(stored,data);
        return {count:1};
      }
    }
  },
  create:async(input,opts)=>{
    creates++;
    assert.ok(opts.idempotencyKey.startsWith("goz-charge-v2-"+donationId+"-"));
    assert.equal(input.metadata.donationId,donationId);
    assert.ok(input.metadata.chargeAttemptId);
    await new Promise(ok=>setTimeout(ok,12));
    lastCreated={id:"pi_synthetic_original",client_secret:"test_secret",metadata:input.metadata,
      amount:input.amount,amount_received:0,currency:input.currency,status:"requires_payment_method"};
    return lastCreated;
  },
  retrieve:async(id)=>{
    retrievals++;
    assert.equal(id,"pi_synthetic_original");
    return lastCreated;
  },
  search:async(q)=>{
    assert.match(q.query,/chargeAttemptId/);
    return {data:stripeSearch,has_more:false};
  }
};
const { issueGuestPaymentGrant, guestPaymentCookieName }=await import("../lib/donations/guest-payment-grant.ts");
const {POST}=await import("../app/api/stripe/charge/route.ts");
let guestToken=null;
issueGuestPaymentGrant({cookies:{set:({name,value,htmlOnly,httpOnly,path})=>{
  assert.equal(name,guestPaymentCookieName(donationId));
  assert.equal(httpOnly,true);assert.equal(path,"/api/stripe/charge");
  guestToken=value;
}}}, donationId);
const server = createServer(async(req,res)=>{
  const body=[];
  for await(const chunk of req)body.push(chunk);
  const request = new Request("http://127.0.0.1/api/stripe/charge",{
    method:"POST",headers:req.headers,body:Buffer.concat(body)
  });
  request.cookies={get:(name)=>{
    const cookies=(req.headers.cookie||"").split(";").map(s=>s.trim());
    const found=cookies.find(s=>s.startsWith(name+"="));
    return found?{value:found.slice(name.length+1)}:undefined;
  }};
  try{
    const answer=await POST(request);
    res.writeHead(answer.status,Object.fromEntries(answer.headers));
    res.end(Buffer.from(await answer.arrayBuffer()));
  } catch(err){res.writeHead(500);res.end(String(err));}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const url="http://127.0.0.1:"+server.address().port+"/";
let passed=0;const pass=name=>{passed++;console.log(JSON.stringify({name,result:"PASS"}))};
const call=async(id=donationId,cookie=null)=>{
 const answer=await fetch(url,{method:"POST",headers:{"content-type":"application/json",...(cookie?{cookie:guestPaymentCookieName(donationId)+"="+cookie}:{})},
  body:JSON.stringify({donationId:id,locale:"ar"})});
 return {status:answer.status,body:await answer.json()};
};
try{
  assert.equal((await call()).status,403);
  assert.equal(creates,0);pass("guest with only donationId cannot create a payment");
  assert.equal((await call(donationId,guestToken+"invalid")).status,403);
  assert.equal((await call(otherId,guestToken)).status,404);
  assert.equal(creates,0);pass("tampered grant or guessed cross-donation ID cannot create a payment");
  globalThis.fixture.session={user:{id:otherId}};
  assert.equal((await call(donationId,guestToken)).status,403);
  assert.equal(creates,0);pass("authenticated non-owner cannot borrow guest grant");
  globalThis.fixture.session=null;
  const results=await Promise.all([call(donationId,guestToken),call(donationId,guestToken)]);
  assert.deepEqual(results.map(x=>x.status).sort(),[200,503]);
  assert.equal(creates,1);
  assert.equal(stored.providerOrderId,"pi_synthetic_original");
  pass("concurrent authorized guest initiation creates only one intent and atomically binds reference");
  assert.equal((await call(donationId,guestToken)).status,200);
  assert.equal(creates,1);assert.equal(retrievals,1);
  pass("authorized retry reuses original Stripe intent without replacing providerOrderId");
  stored.paidAt=new Date();
  assert.equal((await call(donationId,guestToken)).status,409);
  assert.equal(creates,1);pass("settled donation rejects late payment initiation");
  stored=row();stored.provider="PAYFOR";stored.providerOrderId="payfor_existing";
  assert.equal((await call(donationId,guestToken)).status,409);
  assert.equal(creates,1);pass("existing other-provider binding cannot be replaced");
  stored=row();stored.provider="STRIPE";stored.providerOrderId="goz_charge_reserved_"+donationId;
  assert.equal((await call(donationId,guestToken)).status,409);
  assert.equal(creates,1);pass("legacy reservation without nonce is never replayed");
  // Lost response after Stripe created the intent: the original metadata
  // and exact provider reference are discovered without another create.
  stored=row();stored.provider="STRIPE";
  stored.providerOrderId="goz_charge_reserved_"+donationId;
  stored.stripeChargeAttempt={
    version:1,attemptId:"11111111-1111-4111-8111-111111111111",
    donationId,donorId,startedAt:Date.now(),amountMinor:2500,
    currency:"usd",description:"Synthetic cause"
  };
  lastCreated={id:"pi_synthetic_original",client_secret:"test_secret",
    metadata:{donationId,userId:donorId,chargeAttemptId:stored.stripeChargeAttempt.attemptId},
    amount:2500,amount_received:0,currency:"usd",status:"requires_payment_method"};
  stripeSearch=[lastCreated];
  assert.equal((await call(donationId,guestToken)).status,200);
  assert.equal(stored.providerOrderId,"pi_synthetic_original");
  assert.equal(creates,1);pass("lost provider response recovered from verified Stripe search without second create");
  // Key is past Stripe's retention safety margin. A negative search must
  // never authorize a fresh PaymentIntent even if Stripe pruned the key.
  stored.providerOrderId="goz_charge_reserved_"+donationId;
  stored.stripeChargeAttempt.startedAt=Date.now()-25*60*60*1000;
  stripeSearch=[];
  assert.equal((await call(donationId,guestToken)).status,409);
  assert.equal(creates,1);pass("expired idempotency key with search miss fails closed");
  stripeSearch=[lastCreated];
  assert.equal((await call(donationId,guestToken)).status,200);
  assert.equal(creates,1);pass("expired idempotency key can bind positive Stripe evidence only");
  console.log(JSON.stringify({summary:"GUEST_CHARGE_HTTP_PASS",passed,stripeNetworkCalls:0}));
}finally{
  await new Promise(ok=>server.close(ok));
  rmSync(dir,{recursive:true,force:true});
}