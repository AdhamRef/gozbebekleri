import { MongoClient } from "mongodb";
import { assertQaEnvironment } from "./qa-environment-guard.mjs";

/**
 * Read-only QA index and duplicate-ref audit. NO createIndex, migration, repair
 * or writes. Refuses shared Preview/Production configuration.
 *
 * Finance release note: Stripe invoice/refund ledger IDs are immutable _id
 * primary keys. Stripe PaymentIntent references on Donation also need a
 * conditional unique compound index (provider+providerOrderId) once a
 * duplicate review and production-compatible restore are approved.
 */
assertQaEnvironment();
const u=new URL(process.env.DATABASE_URL);
const name=decodeURIComponent(u.pathname.replace(/^\//,""));
const mongo=new MongoClient(process.env.DATABASE_URL, {serverSelectionTimeoutMS:5000});
const required=[
  {collection:"StripeInvoiceSettlement",key:{_id:1},unique:true},
  {collection:"StripeRefundSettlement",key:{_id:1},unique:true},
  {collection:"StripeDeferredRefund",key:{_id:1},unique:true},
  {collection:"Donation",key:{provider:1,providerOrderId:1},unique:true,partial:true},
];
const result=[];
try {
  await mongo.connect();
  const db=mongo.db(name);
  const actualNames=new Set((await db.listCollections({},{nameOnly:true}).toArray()).map(x=>x.name));
  let blockers=0;
  for(const spec of required){
    if(!actualNames.has(spec.collection)){
      result.push({collection:spec.collection,index:"missing collection",status:"BLOCKED"});blockers++;continue;
    }
    const indexes=await db.collection(spec.collection).listIndexes().toArray();
    const found=indexes.find(i=>JSON.stringify(i.key)===JSON.stringify(spec.key));
    const valid=Boolean(found &&
      (found.unique===true || spec.key._id===1) &&
      (!spec.partial || (found.partialFilterExpression?.provider==="STRIPE" &&
         found.partialFilterExpression?.providerOrderId?.$type==="string")));
    result.push({collection:spec.collection,index:Object.keys(spec.key).join("+"),status:valid?"PASS":"BLOCKED"});
    if(!valid)blockers++;
  }
  if(actualNames.has("Donation")){
    const duplicates=await db.collection("Donation").aggregate([
      {$match:{provider:"STRIPE",providerOrderId:{$type:"string"}}},
      {$group:{_id:{provider:"$provider",reference:"$providerOrderId"},n:{$sum:1}}},
      {$match:{n:{$gt:1}}},
      {$count:"duplicateReferences"},
    ]).toArray();
    const duplicateCount=duplicates[0]?.duplicateReferences||0;
    result.push({collection:"Donation",check:"duplicate Stripe refs",status:duplicateCount===0?"PASS":"BLOCKED",duplicateGroups:duplicateCount});
    if(duplicateCount)blockers++;
  }
  for(const item of result)console.log(JSON.stringify(item));
  console.log(JSON.stringify({summary:"READ_ONLY_QA_INDEX_AUDIT",blockers,kind:"nonproduction QA only"}));
  if(blockers)process.exitCode=2;
}finally{await mongo.close()}
