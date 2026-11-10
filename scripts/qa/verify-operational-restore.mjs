import { createHash } from "node:crypto";
import { MongoClient } from "mongodb";
import { assertQaEnvironment } from "./qa-environment-guard.mjs";
import { countDuplicateStripeReferences } from "./financial-index-audit-core.mjs";

/**
 * READ ONLY. Run only AFTER external, authorized mongodump/mongorestore
 * completed between two separately verified QA clusters. The credential
 * URIs stay in protected process environment; none are logged.
 * No secrets, donor data, refs, IDs or connection URIs in stdout.
 */
assertQaEnvironment();
const src=process.env.DATABASE_URL;
const dest=process.env.GOZ_QA_RESTORE_DEST_URL;
const expectedHost=process.env.GOZ_QA_RESTORE_DEST_EXPECTED_HOST;
if(!dest || !expectedHost) throw new Error("RESTORE_DESTINATION_NOT_CONFIGURED");
const sourceURL=new URL(src),targetURL=new URL(dest);
const srcDatabase=decodeURIComponent(sourceURL.pathname.slice(1));
const destDatabase=decodeURIComponent(targetURL.pathname.slice(1));
if(!/^goz_qa_[a-z0-9_]+$/i.test(destDatabase) ||
   targetURL.hostname.toLowerCase()!==expectedHost.toLowerCase() ||
   sourceURL.hostname.toLowerCase()===targetURL.hostname.toLowerCase() ||
   srcDatabase===destDatabase ||
   targetURL.protocol!==sourceURL.protocol) {
  throw new Error("RESTORE_DESTINATION_NOT_ISOLATED");
}
if(process.env.GOZ_QA_RESTORE_EXTERNAL_APPROVAL!=="yes") {
  throw new Error("RESTORE_APPROVAL_REQUIRED");
}
const collections=[
  "Campaign","Category","Donation","DonationItem","DonationCategoryItem",
  "Subscription","SubscriptionItem","SubscriptionCategoryItem",
  "StripeInvoiceSettlement","StripeRefundSettlement","StripeDeferredRefund"
];
const fields=["_id","donationId","subscriptionId","campaignId","categoryId",
  "provider","providerOrderId","stripeSubscriptionId","paidAt","amount",
  "totalAmount","amountUSD","currentAmount","refundedTotalAmount",
  "refundAmount","currency","status","chargeId","invoiceId"];
async function signature(db,name){
 const projection=Object.fromEntries(fields.map(x=>[x,1]));
 const digest=createHash("sha256");
 const summary={count:0,amount:0,total:0,current:0,refunded:0};
 const cursor=db.collection(name).find({},{projection}).sort({_id:1});
 for await(const row of cursor){
   summary.count++;
   summary.amount+=(typeof row.amount==="number"?row.amount:0);
   summary.total+=(typeof row.totalAmount==="number"?row.totalAmount:0);
   summary.current+=(typeof row.currentAmount==="number"?row.currentAmount:0);
   summary.refunded+=(typeof row.refundedTotalAmount==="number"?row.refundedTotalAmount:0);
   digest.update(JSON.stringify(row));
 }
 return {...summary,sha256:digest.digest("hex")};
}
async function inspect(db) {
 const existing=new Set((await db.listCollections({},{nameOnly:true}).toArray()).map(x=>x.name));
 const result={};
 for(const name of collections){
   if(!existing.has(name)) throw new Error("RESTORE_COLLECTION_MISSING_"+name);
   result[name]=await signature(db,name);
 }
 // Relationships: references must point to existing QA documents.
 for(const [child,parent,localField] of [
   ["DonationItem","Donation","donationId"],
   ["DonationItem","Campaign","campaignId"],
   ["DonationCategoryItem","Donation","donationId"],
   ["DonationCategoryItem","Category","categoryId"],
   ["SubscriptionItem","Subscription","subscriptionId"],
   ["SubscriptionItem","Campaign","campaignId"],
   ["SubscriptionCategoryItem","Subscription","subscriptionId"],
   ["SubscriptionCategoryItem","Category","categoryId"]
 ]){
   const orphan=await db.collection(child).aggregate([
     {$lookup:{from:parent,localField,foreignField:"_id",as:"matched"}},
     {$match:{$expr:{$eq:[{$size:"$matched"},0]}}},
     {$count:"n"}
   ]).toArray();
   if((orphan[0]?.n||0)>0) throw new Error("RESTORE_BROKEN_RELATION_"+child+"_"+localField);
 }
 if((await countDuplicateStripeReferences(db.collection("Donation")))!==0)
   throw new Error("RESTORE_DUPLICATE_STRIPE_PROVIDER_REFERENCE");
 for(const name of ["StripeInvoiceSettlement","StripeRefundSettlement","StripeDeferredRefund"]){
   const indexes=await db.collection(name).listIndexes().toArray();
   if(!indexes.some(x=>x.name==="_id_")) throw new Error("RESTORE_MISSING_LEDGER_ID_INDEX");
 }
 return result;
}
const source=new MongoClient(src,{serverSelectionTimeoutMS:7000});
const destination=new MongoClient(dest,{serverSelectionTimeoutMS:7000});
try{
 await Promise.all([source.connect(),destination.connect()]);
 const a=await inspect(source.db(srcDatabase));
 const b=await inspect(destination.db(destDatabase));
 for(const name of collections){
  if(JSON.stringify(a[name])!==JSON.stringify(b[name]))
    throw new Error("RESTORE_FINANCIAL_MISMATCH_"+name);
 }
 console.log(JSON.stringify({status:"QA_MONGORESTORE_READONLY_VERIFIED",
  collectionsCompared:collections.length,financeHashesMatched:true,
  referencesVerified:true,uniqueLedgerIndexesVerified:true}));
} finally{
 await Promise.allSettled([source.close(),destination.close()]);
}
