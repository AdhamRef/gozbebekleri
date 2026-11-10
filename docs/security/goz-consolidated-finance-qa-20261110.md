# Gözbebekleri — Consolidated finance QA review / NO-GO

## Verified ancestry and review ordering
`audit/goz-round2-idempotency-locale-20261109` -> integration PR #197 ->
Stripe settlement PR #210 -> guest ownership PR #211 -> attempt recovery PR #212 ->
`review/goz-stripe-finance-qa-rc-20261110`.

The review branch is created from the exact head of #212 and therefore already
contains every earlier commit through Git ancestry. Do **not** merge this branch
into main, cherry-pick the same PRs twice, or collapse the audit/integration
bases until formal finance authorization.

## Amount and currency contract
The public/legacy donation selector has 14 codes:
USD, EUR, GBP, CAD, AUD, TRY, SAR, AED, KWD, QAR, BHD, OMR, JOD, MAD.
All are explicitly validated. KWD/BHD/OMR/JOD use 3 minor decimal places;
the remaining supported codes use 2. For conservative provider compatibility,
donation totals currently allow at most 2 decimal places even for 3-decimal
currencies, hence the last third-decimal digit must be zero. Invalid fractional
minor units, any unsupported/zero-decimal code, nonfinite amounts, and values
exceeding the shared Stripe amount upper bound fail before payment creation.
Account-specific currency/payment-method acceptance and Stripe minimums
still require authorized Test Mode validation. No currency is quietly converted.

The shared converter is used by direct charge creation and recovery snapshots,
one-time signed settlement matching, legacy `/api/stripe/intent` and
Checkout price construction. Do not modify provider-side amount without
updating the original persisted amount and the complete settlement guard.

## Recovery status contract
Uncertain initiation, provider indexing lag, lost Stripe responses, lost MongoDB
writes, expired idempotency keys and legacy reservations must never clear the
original reservation, reuse a new key, or create a second PaymentIntent.
Instead API returns `paymentStatus=PENDING_VERIFICATION`,
`createNewPayment=false`, a non-success HTTP status and Retry-After.
This is not a provider-confirmed payment success; client must display
"Your payment is being verified. Do not submit a new payment" and retry the
same donation ID through the authorized route. Only Stripe-signed events
can book income and the existing atomic paidAt idempotency gate prevents doubles.
Live Stripe search indexing delays and Stripe Search permission remain
unverified without authorized Test Mode.

## QA secrets / environment isolation blocker
Vercel project `gozbebekleri` has **no custom QA environment** and its
Preview variables presently share protected `DATABASE_URL`,
`DATABASE_URL_MAIN`, `STRIPE_SECRET_KEY`, and authentication settings with
Production targets. Merely creating a branch-scoped guest signing key in this
project would NOT create a safe QA database or test-mode account. Therefore
do not run live authorization/payment tests against the existing Preview.
Do not log or copy any current values.

Preflight for an independently provisioned QA project:
1. Provision a disposable Mongo replica set with a verified nonproduction
   database identity, and a separate Stripe **Test Mode** account/key.
2. Configure a distinct QA URL, NextAuth secret, webhook test secret and
   the `GOZ_GUEST_PAYMENT_KEYS` environment variable as an encrypted secret
   with format `qa-v2:<base64url-32+-byte-key>,qa-v1:<previous-key>`.
   Generate in an approved secret manager; never print or commit keys.
3. Scope these settings only to QA. Assert forbidden Production hostnames
   and disallow production credential fallback before CI tests.
4. Test issuing HttpOnly guest cookies, scoped donation read, expired token,
   old-key verification during rotation and rejection once old key removed.
   Existing isolated tests execute these checks with synthetic keys.
5. Once security approves QA segregation, test real Stripe Search indexing
   lag and delayed/missing results using Test Mode. Search misses do not
   authorize new-key payment creation.

## Access and restore evidence
The isolated HTTP fixture tests ADMIN, STAFF, DONOR and unauthenticated
Guest as unauthorized direct /api/stripe/charge callers, as well as
donor-owner access and guest scoped access. These are controlled role
fixtures, **not** full admin dashboard/end-to-end permission QA.
Signed HTTP/Mongo tests use a local Mongo memory replica set, restore a
synthetic BSON snapshot into a second isolated database, compare financial
balances and confirm unique refund/invoice ledger IDs. They are **not** a
production backup/restore drill or a validated production migration.
An authorized real mongodump/mongorestore against a separate staging clone,
index inventory/provisioning and business review are still required.

## Mandatory release blockers
1. Stripe Test Mode, including `paymentIntents.search` indexing delay,
   search pagination/ambiguous results and currency-specific authorization.
2. A completely segregated QA with independent keys and database; QA cookie
   issuance and live rotation test after it exists.
3. Four-role end-to-end permission review across administrative APIs,
   campaigns, donation views, refunds, and direct URLs (not charge alone).
4. Production-compatible backup/restore rehearsal on isolated restored copy,
   relevant unique indexes and audit signoff.
5. Finance/security GO authorization. PR #197, #210, #211, #212 and this
   review branch must remain out of main until all gates pass.

## Actual environment authority and findings (2026-11-10)
Creating a dedicated Vercel project returned 403 Forbidden. Attempting a
Git-linked QA project reused the existing production-linked project instead.
No production/preview configuration was changed; no secrets were decrypted.
There are zero Vercel custom QA environments. Metadata inspection confirms
the following keys target BOTH production and preview: DATABASE_URL,
DATABASE_URL_MAIN, NEXTAUTH_URL, NEXTAUTH_SECRET, STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. That is not
proof of identical values, but IS proof that independence has not been
established. Do not send test writes, logins or payment API calls to Preview.

The connected Stripe account permits Live mode only. The Atlas orgs available
to this connection belong to another institution; no database is authorized
for Gozbebekleri QA.

### Dedicated QA provisioning checklist
1. Authorized operator creates a separate Gozbebekleri-owned MongoDB replica
   set and a new Vercel QA project, both protected and isolated. No copying
   production secret values or donor records.
2. Set DATABASE_URL to an independently reviewed database named goz_qa_*.
   Explicitly attest GOZ_QA_EXPECTED_MONGO_HOST,
   GOZ_QA_DB_IDENTITY_VERIFIED=yes and GOZ_QA_ISOLATION_APPROVED=yes.
   Do not set DATABASE_URL_MAIN or inherit any Production variable.
3. Configure independent NEXTAUTH_SECRET, NEXTAUTH_URL, Stripe Test Mode
   STRIPE_SECRET_KEY (sk_test_*), publishable key (pk_test_*),
   Stripe webhook Test Mode secret and GOZ_GUEST_PAYMENT_KEYS as encrypted
   QA-only secrets. No values or generated keys in GitHub/log output.
4. Run node scripts/qa/qa-environment-guard.mjs before any live QA test.
   This is a metadata and hostname guard, NOT proof that an operator's
   declared DB hostname is truly independent. Confirm identity out-of-band.
5. Guest charge cookies last 1 hour but receipt grants last **24 hours**.
   Keep previous signing keys at least 24 hours plus deployment propagation
   margin when rotating. An ID alone is no longer receipt authorization.
   Expired receipt grants require signed-in identity or verified reissue.

### Role-access test matrix

| Surface | ADMIN | STAFF | DONOR | Guest | Evidence |
| --- | --- | --- | --- | --- | --- |
| Direct Stripe charge | Own only | Own only | Own only | Signed scoped payment grant | Synthetic HTTP PASS |
| Donation receipt | Revenue permission | Revenue grant | Owner only | Signed scoped receipt grant | Unit policy PASS; deployed HTTP untested |
| Admin APIs | Authorized | Granular permission | Denied | Denied | QA NOT RUN |
| Donor account and history | Authorized | Granular permission | Own only | No cross-account access | QA NOT RUN |
| Donations, subscriptions, refunds | Authorized | Granular | Own limited actions | Restricted | QA NOT RUN |
| Reports/export | Authorized | reportsExport permission | Denied | Denied | QA NOT RUN |
| Certificates and additional receipts | Authorized | Granular | Own only | Scoped access | QA NOT RUN |
| Upload and media | Authorized | Granular | Restricted | Restricted | QA NOT RUN |
| Campaigns and communications | Authorized | Granular | Denied | Denied | QA NOT RUN |

Do not count UI button visibility as server authorization. Execute two
separate DONOR fixtures plus each role via direct HTTP, including negative
mutations and persisted state assertions, only in approved QA.

### Financial index and operational restore gates
StripeInvoiceSettlement, StripeRefundSettlement and StripeDeferredRefund
use their immutable provider IDs as Mongo _id. Existing secondary Prisma
indexes are mostly non-unique performance indexes. A proposed partial
unique MongoDB index on Donation(provider, providerOrderId) for Stripe with
string references requires duplicate inventory and finance approval first.
Never apply it directly to production or infer it already exists.

node scripts/qa/audit-financial-indexes-readonly.mjs performs only QA
metadata inspection and duplicate-reference counting after the QA guard.
It cannot substitute for inspecting production indexes before release.

Run mongodump/mongorestore against separately authorized QA source and
restore-only destinations using protected database-tool configuration
files rather than command-line URI credentials. Compare source/destination
document counts, unique indexes, donation-project allocations, subscription
relationships, Stripe invoice/refund references and financial totals.
Then replay a signed provider event against the restored clone and verify
no double credit; test transaction rollback under concurrent writes.
The prior synthetic BSON round-trip is not this operational restore test.

### Runtime and build distinction
Earlier Next build had a localhost Mongo URL without a running server:
connection refused errors were printed even when the build succeeded.
This is NOT a runtime database PASS. New CI runs the build against a
reachable isolated Mongo memory replica set, tests ping, and fails if
Mongo connection errors appear. It remains a build/database-connectivity
smoke test, not full deployed API runtime QA. Real QA remains blocked.
