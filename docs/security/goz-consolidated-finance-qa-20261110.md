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
