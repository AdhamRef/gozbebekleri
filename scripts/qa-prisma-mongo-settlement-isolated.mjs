/**
 * Synthetic integration test using the REAL generated Prisma Client against
 * an isolated, disposable MongoDB Replica Set (no production network access).
 * 
 * Manual only: npm install --no-save --package-lock=false --ignore-scripts mongodb-memory-server@10.1.4
 * Then: DATABASE_URL=mongodb://127.0.0.1:27017/goz_synthetic npx prisma generate
 * Then: node scripts/qa-prisma-mongo-settlement-isolated.mjs
 *
 * The script OVERRIDES DATABASE_URL to a fresh local in-memory instance.
 * Never prints or reads donor data, credentials or payment methods.
 */
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { PrismaClient } from "@prisma/client";

const repl = await MongoMemoryReplSet.create({
  binary: { version: "7.0.15" },
  replSet: { count: 1 },
});
const uri = repl.getUri("goz_isolated_qa");
process.env.DATABASE_URL = uri;
const mongo = new MongoClient(uri);
const prisma = new PrismaClient();
try {
  await mongo.connect();
  const db = mongo.db("goz_isolated_qa");
  const subscriptionId = new ObjectId();
  const created = new Date("2026-10-31T20:00:00Z");
  const paid = new Date("2026-11-01T05:10:00Z");
  await db.collection("Donation").insertMany([
    {
      _id: new ObjectId(), status: "PAID", amount: 100, amountUSD: 100,
      totalAmount: 100, teamSupport: 0, fees: 0, currency: "USD",
      createdAt: created, paidAt: paid, subscriptionId,
      providerOrderId: "in_fixture_001",
    },
    {
      _id: new ObjectId(), status: "PAID", amount: 100, amountUSD: 100,
      totalAmount: 100, teamSupport: 0, fees: 0, currency: "USD",
      createdAt: created, subscriptionId, providerOrderId: "sub_fixture_001",
    },
    {
      _id: new ObjectId(), status: "FAILED", amount: 500, amountUSD: 500,
      totalAmount: 500, teamSupport: 0, fees: 0, currency: "USD",
      createdAt: created, paidAt: null, subscriptionId,
    },
  ]);

  const settled = await prisma.donation.findMany({
    where: { status: "PAID", paidAt: { not: null } },
    select: { id: true, paidAt: true },
  });
  const pending = await prisma.donation.findMany({
    where: {
      status: "PAID",
      OR: [{ paidAt: null }, { paidAt: { isSet: false } }],
    },
    select: { id: true },
  });
  const invoice = await prisma.donation.findMany({
    where: {
      subscriptionId: subscriptionId.toHexString(),
      providerOrderId: "in_fixture_001",
    },
    select: { id: true },
  });
  assert.equal(settled.length, 1);
  assert.equal(pending.length, 1);
  assert.equal(invoice.length, 1);
  assert.equal(settled[0].paidAt?.toISOString(), paid.toISOString());
  console.log(JSON.stringify({
    result: "PASS", engine: "Prisma Client + MongoDB ReplicaSet",
    settled: settled.length, pending: pending.length, invoiceRows: invoice.length,
  }));
} finally {
  await prisma.$disconnect();
  await mongo.close();
  await repl.stop();
}
