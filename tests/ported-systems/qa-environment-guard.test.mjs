import test from "node:test";
import assert from "node:assert/strict";
import {qaEnvironmentProblems,assertQaEnvironment} from "../../scripts/qa/qa-environment-guard.mjs";

const testKey = Buffer.alloc(32,17).toString("base64url");
const isolated=()=>({
  GOZ_QA_ISOLATION_APPROVED:"yes",
  GOZ_QA_DB_IDENTITY_VERIFIED:"yes",
  GOZ_QA_EXPECTED_MONGO_HOST:"127.0.0.1",
  GOZ_QA_LOCAL_ONLY:"yes",
  DATABASE_URL:"mongodb://127.0.0.1:27018/goz_qa_fixture",
  NEXTAUTH_SECRET:"qa-auth-independent-fixture",
  GOZ_GUEST_PAYMENT_KEYS:"testkey:"+testKey,
  STRIPE_SECRET_KEY:"sk_test_fixture_not_network",
  STRIPE_WEBHOOK_SECRET:"whsec_fake_no_network",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:"pk_test_fixture_not_network",
  NEXTAUTH_URL:"http://127.0.0.1:3000",
  NODE_ENV:"test",VERCEL_ENV:"preview",
});
test("QA boundary accepts explicitly isolated local synthetic fixtures, not evidence of live QA",()=>{
  assert.deepEqual(qaEnvironmentProblems(isolated()),[]);
  assert.equal(assertQaEnvironment(isolated()),true);
});
test("QA boundary rejects live keys, production, mismatched DB hostname and inherited database",()=>{
  const base=isolated();
  for (const [key,value,needle] of [
    ["STRIPE_SECRET_KEY","sk_live_not_allowed","STRIPE_LIVE_CREDENTIAL_FORBIDDEN"],
    ["VERCEL_ENV","production","PRODUCTION_RUNTIME_FORBIDDEN"],
    ["NODE_ENV","production","PRODUCTION_RUNTIME_FORBIDDEN"],
    ["GOZ_QA_EXPECTED_MONGO_HOST","production-database.example","QA_DATABASE_HOST_MISMATCH"],
    ["GOZ_QA_ISOLATION_APPROVED","no","QA_APPROVAL_REQUIRED"],
    ["GOZ_QA_DB_IDENTITY_VERIFIED","no","DB_IDENTITY_APPROVAL_REQUIRED"],
    ["DATABASE_URL_MAIN","mongodb://not_read.example/db","DATABASE_URL_MAIN_INHERITED"],
    ["DATABASE_URL","mongodb://127.0.0.1:27018/main","QA_DATABASE_NAME_REQUIRED"],
    ["NEXTAUTH_URL","https://gozbebekleri.org","PRODUCTION_DOMAIN_FORBIDDEN"],
    ["GOZ_GUEST_PAYMENT_KEYS","wrong","INVALID_GUEST_PAYMENT_KEY_RING"],
  ]) {
    const problems=qaEnvironmentProblems({...base,[key]:value});
    assert.ok(problems.includes(needle),key+": "+problems.join(","));
    assert.throws(()=>assertQaEnvironment({...base,[key]:value}),/QA_ENVIRONMENT_BLOCKED/);
  }
});
test("QA boundary rejects missing test-mode and unique signing key requirements",()=>{
  const base=isolated();
  delete base.GOZ_GUEST_PAYMENT_KEYS;
  const errors=qaEnvironmentProblems(base);
  assert.ok(errors.includes("MISSING_GOZ_GUEST_PAYMENT_KEYS"));
  assert.ok(errors.includes("INVALID_GUEST_PAYMENT_KEY_RING"));
  assert.ok(qaEnvironmentProblems({...isolated(),GOZ_GUEST_PAYMENT_KEYS:"old:"+testKey+",old:"+testKey}).includes("INVALID_GUEST_PAYMENT_KEY_RING"));
});
