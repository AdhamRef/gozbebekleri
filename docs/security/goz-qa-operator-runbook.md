# Gözbebekleri — approved QA execution runbook (NO-GO until sign-off)

This runbook describes commands **to run only after a dedicated QA project, a
separate Gözbebekleri MongoDB replica set, and approved Stripe Test Mode
credentials exist**. None of these commands authorizes Production access.

## Required infrastructure permissions

Vercel operator needs access to the correct Gözbebekleri team with
**permission to create projects**, configure project Git integration,
manage project environment variables/secrets, protect deployments,
read build logs and trigger **Preview/custom QA** deployments.
The minimum to provision a new project is the Vercel **Create Project**
permission (included for Owner/Member, available as an extended permission
for Developer/Contributor depending on team plan). Environment Variable
Manager and Deployment Protection Manager are also required for the
appropriate QA configuration; add Environment Manager for a custom QA
environment. These permissions must be limited to QA duties where the
Vercel plan supports the corresponding scopes. Never grant Production
deployment/promotion/rollback simply to run tests.
Grant *no* production deploy/promotion/rollback permission to the QA test
operator. The existing tool credential received HTTP 403 for project
creation; request a project-creation-capable team role from the account owner,
not an access token in chat.

MongoDB Atlas operator: permission to create a Gözbebekleri-only project,
dedicated replica set with transactions enabled, distinct database users
(read/write for QA application, read-only for audit, backup and restore roles
separately), QA-only network allowlist, IP restrictions and encrypted backups.
Never attach to another organization's Atlas project or production cluster.
Add a read-only QA infrastructure identity attestation outside the repo.

Stripe operator: Test Mode enabled for the Gözbebekleri-owned Stripe account.
Use only test-mode restricted API keys, separate publishable key, dedicated
test-mode Webhook endpoint/signing secret and allowed test cards. Verify
Webhook signatures, use a test-only event stream and confirm provider mode
is test before creating any PaymentIntent. The connected account currently
exposes Live only; no live payment calls are authorized.

## Required QA-only environment variable NAMES — no values in Git

- DATABASE_URL
- GOZ_QA_EXPECTED_MONGO_HOST
- GOZ_QA_DB_IDENTITY_VERIFIED
- GOZ_QA_ISOLATION_APPROVED
- VERCEL_PROJECT_ID (the distinct QA project ID, NOT the production project)
- VERCEL_ENV (preview) or scoped VERCEL_TARGET_ENV for custom QA
- NEXTAUTH_URL, NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (QA-only OAuth client when login tests need it)
- GOZ_GUEST_PAYMENT_KEYS (independent rotated key ring)
- STRIPE_SECRET_KEY (test mode only)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test mode only)
- STRIPE_WEBHOOK_SECRET (test mode only)
- APP_URL / NEXT_PUBLIC_SITE_URL (QA hostname only)
- GOZ_QA_RESTORE_DEST_URL, GOZ_QA_RESTORE_DEST_EXPECTED_HOST (for restore verifier only)
- GOZ_QA_RESTORE_EXTERNAL_APPROVAL (set by authorized operator after independent verification)

Never inherit DATABASE_URL_MAIN. Do not copy secret values or donor data from
Production. The guard checks environment signals but cannot prove independent
provider accounts merely from operator-controlled flags or DB names.

## Environment preflight (do not run on shared Preview)

```bash
node scripts/qa/qa-environment-guard.mjs
node scripts/qa/audit-financial-indexes-readonly.mjs
```

Before running, an operator must independently verify the actual Vercel
project ID, Atlas project ID, replica-set hosts and credentials, Stripe
account/mode and Webhook target, with written approval.

## Stripe QA acceptance (requires signed test payment plan)

Run the existing isolated regression tests first, then run a separately
approved Test Mode HTTP test harness in QA to cover:
- PaymentIntent creation, success, decline, timeout
- search indexing lag/no result; do not infer a search miss means no intent
- lost API response, Mongo outage, retry within fixed idempotency key window
- late/duplicate signed Webhook, concurrent recovery, no duplicate revenue
- all 14 currencies, Stripe's actual country/method/minimum constraints

Synthetic Node tests are **not** Stripe Test Mode evidence.

## Operational MongoDB restore drill (QA only)

Do NOT run the following until source and target clusters have been
independently attested as distinct QA resources and database-tools
config files are protected. These configs must be created inside approved
QA infrastructure by an operator, with secrets stored only there.
No credentials in shell history, command-line URI flags, CI artifacts or logs.

```bash
# Use only after explicit operator approval and verified separate clusters.
# Variables below are protected QA job environment settings, not CLI secrets.
: "${GOZ_QA_SOURCE_TOOLS_CONFIG:?required}"
: "${GOZ_QA_TARGET_TOOLS_CONFIG:?required}"
: "${GOZ_QA_SOURCE_DB:?required}"
: "${GOZ_QA_RESTORE_DB:?required}"
: "${GOZ_QA_ARCHIVE:?required}"
test "${GOZ_QA_SOURCE_DB}" != "${GOZ_QA_RESTORE_DB}"

mongodump --config="${GOZ_QA_SOURCE_TOOLS_CONFIG}" \
  --db="${GOZ_QA_SOURCE_DB}" --archive="${GOZ_QA_ARCHIVE}" --gzip

# --drop only affects the separately approved empty QA restore destination.
mongorestore --config="${GOZ_QA_TARGET_TOOLS_CONFIG}" \
  --archive="${GOZ_QA_ARCHIVE}" --gzip \
  --nsFrom="${GOZ_QA_SOURCE_DB}.*" --nsTo="${GOZ_QA_RESTORE_DB}.*" --drop --stopOnError

# This verifier is READ-ONLY. It compares source and restored QA:
# counts, stable financial digests, donation allocations, subscription
# references, duplicate Stripe references and unique ledger ID indexes.
node scripts/qa/verify-operational-restore.mjs
```

Quiesce all writes to the isolated QA source during the dump, or arrange a
consistent provider-supported backup snapshot. `mongodump --db` alone
must not be presented as a transactionally consistent snapshot of a
database receiving concurrent writes.

After restoring, independently replay signed TEST Webhooks on the **restore
clone only**, assert idempotency and rollback on write conflicts, then
perform review of any proposed partial unique Stripe provider reference
index. Never create the index before the read-only duplicate inventory is
approved and finance/data owners accept the migration plan.

## Receipt recovery after 24-hour guest grant expiry

The original guest browser can download within its 24-hour, HttpOnly
scoped receipt grant. After expiry, the donor must sign in through the
ordinary verified authentication process (email/password, OAuth or an
approved verified account recovery). The authenticated **original owner**
may POST to /api/donations/{id}/receipt, with a valid same-origin header, to
mint a fresh 24-hour scoped receipt grant. Unauthenticated visitors, admins
requesting grant on someone else's behalf and other donors cannot refresh
it. Old phone-only guests unable to authenticate require manually verified
support/account recovery, with no automatic ID-based bypass.
The success page can prompt sign-in and the owner can download directly.

The guest account-link endpoint now requires a separate original-browser
signed claiming grant; a guessed donation ID plus someone else's login does
not authorize transferring a donor's donation account.

## Remaining financial gates

A complete 4-role deployed HTTP QA matrix, real Test Mode transactions,
full QA restore and index acceptance, and independent security/finance
approval remain mandatory. Keep #197, #210, #211, #212 and #213 Draft and
unmerged into main.
