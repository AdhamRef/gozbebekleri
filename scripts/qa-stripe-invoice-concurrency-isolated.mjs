/**
 * True concurrency: Prisma Client + isolated MongoDB Replica Set.
 * This script only creates disposable local fixtures; never accepts production
 * connection strings, performs payments, or modifies donor records.
 *
 * npm install --no-save --package-lock=false --ignore-scripts mongodb-memory-server@10.1.4
 * DATABASE_URL=mongodb://127.0.0.1:27017/ignored npx prisma generate
 * node --import tsx scripts/qa-stripe-invoice-concurrency-isolated.mjs
 */
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { PrismaClient } from "@prisma/client";
import { settleStripeInvoiceOnce } from "../lib/donations/stripe-invoice-settlement.ts";

const server=await MongoMemoryReplSet.create({binary:{version:"7.0.15"},replSet:{count:1}});
process.env.DATABASE_URL=server.getUri("goz_concurrency_fixture");
const mongo=new MongoClient(process.env.DATABASE_URL);
const prisma=new PrismaClient();
try {
 await mongo.connect();
 const db=mongo.db("goz_concurrency_fixture");
 // Explicitly provision receipt and campaign collections BEFORE transactions.
 await db.createCollection("StripeInvoiceSettlement");
 await db.createCollection("Donation");
 await db.createCollection("Campaign");
 const campaignId=new ObjectId(), donorId=new ObjectId(),subscriptionId=new ObjectId();
 await db.collection("Campaign").insertOne({_id:campaignId,title:"Synthetic only",description:"Fixture",targetAmount:10000,currentAmount:0,baselineAmount:0,images:[]});
 let callbackEntered=0;
 const pay=(id)=>settleStripeInvoiceOnce(prisma,{invoiceId:id,subscriptionId:subscriptionId.toHexString(),paidAt:new Date("2026-11-09T05:10:00Z")},async tx=>{
   callbackEntered++;
   await tx.donation.create({data:{
    donorId:donorId.toHexString(),subscriptionId:subscriptionId.toHexString(),
    amount:100,totalAmount:100,amountUSD:100,currency:"USD",
    status:"PAID",paidAt:new Date("2026-11-09T05:10:00Z"),
    provider:"STRIPE",providerOrderId:id
   },select:{id:true}});
   await tx.campaign.update({where:{id:campaignId.toHexString()},data:{currentAmount:{increment:100}},select:{id:true,currentAmount:true}});
 });
 const simultaneous=await Promise.all([pay("in_fixture_once"),pay("in_fixture_once")]);
 assert.deepEqual(simultaneous.sort(),["duplicate","settled"]);
 assert.equal(await db.collection("Donation").countDocuments({providerOrderId:"in_fixture_once"}),1);
 assert.equal(await db.collection("StripeInvoiceSettlement").countDocuments({_id:"in_fixture_once"}),1);
 let campaign=await db.collection("Campaign").findOne({_id:campaignId});
 assert.equal(campaign.currentAmount,100);
 const replay=await Promise.all(Array.from({length:6},()=>pay("in_fixture_once")));
 assert.ok(replay.every(x=>x==="duplicate"));
 assert.equal(await db.collection("Donation").countDocuments({providerOrderId:"in_fixture_once"}),1);
 campaign=await db.collection("Campaign").findOne({_id:campaignId});
 assert.equal(campaign.currentAmount,100);
 // A separate invoice for the same subscription is a genuinely new payment.
 assert.equal(await pay("in_fixture_renewal"),"settled");
 assert.equal(await db.collection("Donation").countDocuments({subscriptionId}),2);
 campaign=await db.collection("Campaign").findOne({_id:campaignId});
 assert.equal(campaign.currentAmount,200);
 await assert.rejects(
   settleStripeInvoiceOnce(prisma,{invoiceId:"in_fixture_once",subscriptionId:new ObjectId().toHexString(),paidAt:new Date()},async()=>{}),
   /conflicting subscription owner/,
 );
 console.log(JSON.stringify({result:"PASS",parallelResponses:simultaneous,replayCount:replay.length,invoiceCount:2,donations:2,campaignAmount:campaign.currentAmount,callbackEntered,prisma:"REAL",database:"ISOLATED MongoDB replica set"}));
}finally{
 await prisma.$disconnect();
 await mongo.close();
 await server.stop();
}
