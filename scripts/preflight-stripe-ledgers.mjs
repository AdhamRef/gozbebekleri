/**
 * Explicitly prepare the two MongoDB financial settlement collections.
 * Default is READ-ONLY. --apply is allowed only after three manual release
 * attestations are present; this tool NEVER dumps credentials or donor records.
 *
 * NODE_ENV=production GOZ_DB_IDENTITY_CONFIRMED=yes \
 * GOZ_DB_RESTORE_VERIFIED=yes GOZ_FINANCE_RELEASE_APPROVED=yes \
 * DATABASE_URL=<from managed secret store> node scripts/preflight-stripe-ledgers.mjs --apply
 *
 * No production execution in automated CI. CI may use an isolated database.
 */
import {MongoClient} from "mongodb";
const apply=process.argv.includes("--apply");
const required=["GOZ_DB_IDENTITY_CONFIRMED","GOZ_DB_RESTORE_VERIFIED","GOZ_FINANCE_RELEASE_APPROVED"];
if(apply && required.some(name=>process.env[name]!=="yes")){
  console.error("BLOCKED: manual identity, successful restore and finance approval are required.");
  process.exit(2);
}
if(!process.env.DATABASE_URL){console.error("BLOCKED: managed DATABASE_URL is unavailable");process.exit(2)}
const url=new URL(process.env.DATABASE_URL);
if(!/^mongodb(\+srv)?:$/.test(url.protocol)){console.error("BLOCKED: invalid database URL scheme");process.exit(2)}
const databaseName=decodeURIComponent(url.pathname.replace(/^\//,""));
if(!databaseName){console.error("BLOCKED: database name must be explicit");process.exit(2)}
const client=new MongoClient(process.env.DATABASE_URL,{serverSelectionTimeoutMS:8000});
try{
 await client.connect();
 const db=client.db(databaseName);
 const spec=[
  ["StripeInvoiceSettlement",[{key:{subscriptionId:1,paidAt:1},name:"subscriptionId_1_paidAt_1"}]],
  ["StripeRefundSettlement",[{key:{donationId:1,status:1},name:"donationId_1_status_1"},{key:{chargeId:1},name:"chargeId_1"}]],
  ["StripeDeferredRefund",[{key:{status:1,nextAttemptAt:1},name:"status_1_nextAttemptAt_1"}]],
 ];
 const existing=new Set((await db.listCollections({}, {nameOnly:true}).toArray()).map(x=>x.name));
 for(const [name,indexes] of spec){
  if(!existing.has(name)){
   if(apply)await db.createCollection(name);
   else console.log(JSON.stringify({collection:name,exists:false,requiredAction:"create before production webhook"}));
  }
  if(apply || existing.has(name)){
   const c=db.collection(name);
   if(apply)for(const index of indexes)await c.createIndex(index.key,{name:index.name});
   const actual=await c.listIndexes().toArray();
   const has=(key)=>actual.some(index=>JSON.stringify(index.key)===JSON.stringify(key));
   const state={collection:name,exists:true,uniqueMongoId:has({_id:1}),indexes:indexes.map(x=>({name:x.name,present:has(x.key)}))};
   console.log(JSON.stringify(state));
   if(apply && (!state.uniqueMongoId||state.indexes.some(x=>!x.present)))throw Error("POST_PROVISION_INDEX_VERIFY_FAILED");
  }
 }
 console.log(JSON.stringify({result:apply?"APPLIED_AND_VERIFIED":"READ_ONLY_INSPECTION",databaseName:"[redacted]",timestamp:new Date().toISOString()}));
}finally{await client.close()}
