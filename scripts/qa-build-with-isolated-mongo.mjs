import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Build with a reachable isolated replica set instead of a refused localhost
 * URL. No production or hosted database credentials are accepted here.
 * This is a BUILD/DB CONNECTIVITY smoke test, not full runtime acceptance.
 */
const repl = await MongoMemoryReplSet.create({
  binary: { version: "7.0.15" },
  replSet: { count: 1 },
});
let mongo;
try {
  const uri = repl.getUri("ported_systems_fixture");
  assert.ok(uri.startsWith("mongodb://127.0.0.1:"));
  mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await mongo.connect();
  const ping = await mongo.db("ported_systems_fixture").admin().ping();
  assert.equal(ping.ok,1);
  console.log("BUILD_MONGO_REPLICA_PING_PASS (isolated)");

  const args=["--no-install","next","build"];
  const child=spawn("npx",args,{
    env:{
      ...process.env,
      DATABASE_URL:uri,
      DATABASE_URL_MAIN:"",
      STRIPE_SECRET_KEY:"sk_test_fixture_no_network",
      NEXTAUTH_SECRET:"isolated-build-fixture-not-production",
    },
    stdio:["ignore","pipe","pipe"],
  });
  let suspicious=false;
  for (const stream of [child.stdout,child.stderr]) {
    stream.on("data",chunk=>{
      const line=String(chunk);
      if (/Raw query failed|server selection timeout|ECONNREFUSED|connection refused/i.test(line)) suspicious=true;
      (stream===child.stdout?process.stdout:process.stderr).write(chunk);
    });
  }
  const code = await new Promise((resolve,reject)=>{
    child.on("error",reject);
    child.on("close",resolve);
  });
  assert.equal(code,0,"Next build with reachable isolated database");
  assert.equal(suspicious,false,"Do not approve a build that silently logs DB connection failures");
  console.log("BUILD_DATABASE_CONNECTIVITY_PASS (not end-to-end runtime QA)");
} finally {
  if (mongo) await mongo.close();
  await repl.stop();
}
