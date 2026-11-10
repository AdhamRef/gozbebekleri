/**
 * QA credential boundary. This is metadata-only and performs ZERO requests.
 * Set secrets in a dedicated project/environment after independent review.
 * Never emit the value of any secret or a connection string to logs.
 */
function safeHostname(connectionString) {
  try {
    const u = new URL(connectionString);
    if (!["mongodb:", "mongodb+srv:"].includes(u.protocol)) return null;
    const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
    return {host:u.hostname.toLowerCase(), database};
  } catch { return null; }
}
export function qaEnvironmentProblems(env = process.env) {
  const errors = [];
  const required = ["GOZ_QA_ISOLATION_APPROVED", "GOZ_QA_DB_IDENTITY_VERIFIED",
    "GOZ_QA_EXPECTED_MONGO_HOST", "DATABASE_URL", "NEXTAUTH_SECRET",
    "GOZ_GUEST_PAYMENT_KEYS", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "NEXTAUTH_URL"];
  for (const key of required) if (!env[key]) errors.push("MISSING_"+key);

  if (env.GOZ_QA_ISOLATION_APPROVED !== "yes") errors.push("QA_APPROVAL_REQUIRED");
  if (env.GOZ_QA_DB_IDENTITY_VERIFIED !== "yes") errors.push("DB_IDENTITY_APPROVAL_REQUIRED");
  // Next.js intentionally sets NODE_ENV=production for *both* QA and
  // production optimized builds. VERCEL_ENV / immutable deployment project
  // identity must determine the hosted environment boundary instead.
  if (env.VERCEL_ENV === "production") errors.push("PRODUCTION_RUNTIME_FORBIDDEN");
  const productionProjectId = "prj_hkMyu8iABc7AAqF7T1DvYRpKYRqV";
  if (env.VERCEL_PROJECT_ID === productionProjectId) errors.push("SHARED_PRODUCTION_VERCEL_PROJECT_FORBIDDEN");
  if (env.VERCEL === "1" && !env.VERCEL_PROJECT_ID) errors.push("VERCEL_PROJECT_ID_REQUIRED");
  if (env.VERCEL === "1" && env.GOZ_QA_LOCAL_ONLY === "yes") errors.push("LOCAL_QA_MODE_FORBIDDEN_ON_HOSTED_ENV");
  if (env.VERCEL === "1" && env.VERCEL_ENV !== "preview" && !env.VERCEL_TARGET_ENV) {
    errors.push("QA_PREVIEW_OR_CUSTOM_ENV_REQUIRED");
  }
  // Environment-variable approvals and database names are self-declarations,
  // NOT evidence that database identity/network policy is independent.
  // Operators must validate the actual provider project, cluster identity,
  // DNS and non-production Stripe account outside this preflight.

  if (env.DATABASE_URL_MAIN) errors.push("DATABASE_URL_MAIN_INHERITED");
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_test_")) errors.push("STRIPE_LIVE_CREDENTIAL_FORBIDDEN");
  if (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_")) errors.push("STRIPE_TEST_PUBLISHABLE_KEY_REQUIRED");
  if (env.STRIPE_WEBHOOK_SECRET && !env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) errors.push("STRIPE_WEBHOOK_TEST_SECRET_REQUIRED");

  const parsed = safeHostname(env.DATABASE_URL);
  if (!parsed) errors.push("INVALID_QA_DATABASE_URL");
  else {
    if (!/^goz_qa_[a-z0-9_]+$/i.test(parsed.database)) errors.push("QA_DATABASE_NAME_REQUIRED");
    if (parsed.host !== env.GOZ_QA_EXPECTED_MONGO_HOST?.toLowerCase()) errors.push("QA_DATABASE_HOST_MISMATCH");
    if (["localhost","127.0.0.1"].includes(parsed.host) && env.GOZ_QA_LOCAL_ONLY !== "yes") errors.push("LOCAL_HOST_NOT_APPROVED");
    if (env.GOZ_QA_LOCAL_ONLY !== "yes" && /(?:^|\.)(?:prod|production)(?:\.|$)/i.test(parsed.host)) errors.push("PRODUCTION_DATABASE_HOST_FORBIDDEN");
  }
  try {
    const url = new URL(env.NEXTAUTH_URL || "");
    const isLocal = env.GOZ_QA_LOCAL_ONLY === "yes" && url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !isLocal) errors.push("QA_HTTPS_REQUIRED");
    if (url.hostname === "gozbebekleri.org" ||
        url.hostname.endsWith(".gozbebekleri.org") ||
        url.hostname === "minberiaksa.org") errors.push("PRODUCTION_DOMAIN_FORBIDDEN");
  } catch { errors.push("INVALID_QA_NEXTAUTH_URL"); }

  const entries = (env.GOZ_GUEST_PAYMENT_KEYS || "").split(",").filter(Boolean);
  const ids = entries.map(entry => entry.split(":")[0]);
  if (!entries.length || entries.length>4 ||
      new Set(ids).size !== entries.length ||
      entries.some(x=> !/^[a-zA-Z0-9_-]{1,24}:[a-zA-Z0-9_-]{43,}$/.test(x))) {
    errors.push("INVALID_GUEST_PAYMENT_KEY_RING");
  }
  if (env.GOZ_GUEST_PAYMENT_KEYS && env.NEXTAUTH_SECRET &&
      env.GOZ_GUEST_PAYMENT_KEYS === env.NEXTAUTH_SECRET) errors.push("GUEST_KEY_MUST_BE_SEPARATE");
  if (env.STRIPE_SECRET_KEY && env.NEXTAUTH_SECRET &&
      env.STRIPE_SECRET_KEY === env.NEXTAUTH_SECRET) errors.push("AUTH_KEY_MUST_BE_SEPARATE");
  return [...new Set(errors)];
}
export function assertQaEnvironment(env = process.env) {
  const errors = qaEnvironmentProblems(env);
  if (errors.length) throw new Error("QA_ENVIRONMENT_BLOCKED: "+errors.join(","));
  return true;
}
if (process.argv[1]?.endsWith("qa-environment-guard.mjs")) {
  try {
    assertQaEnvironment();
    process.stdout.write("QA_BOUNDARY_PREFLIGHT_PASS (metadata only; not a runtime or Stripe test)\n");
  } catch(err) {
    process.stderr.write(err.message+"\n");
    process.exitCode=2;
  }
}
