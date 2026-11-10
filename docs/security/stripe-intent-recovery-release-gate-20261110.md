# One-time Stripe initiation recovery / release gate (2026-11-10)

## Durable state and provider authority

Every new direct Stripe one-time charge is atomically reserved with
`Donation.providerOrderId = goz_charge_reserved_<donationId>` AND the immutable
`Donation.stripeChargeAttempt` JSON snapshot (UUID nonce, owner, amount in minor
units, currency, creation timestamp, exact description). No Stripe call occurs
until the MongoDB compare-and-set succeeds. Reservations without a snapshot are
legacy and remain locked for independent manual reconciliation.

On retry, the server first requests a Stripe PaymentIntent search scoped by the
original nonce and re-retrieves any positive match from Stripe. Every candidate
must exactly match the persisted donation, donor, amount, currency and nonce.
Multiple or contradictory matches require manual review. An empty Stripe
search is **not evidence that an intent does not exist**.

For the first **20 hours** after reservation, the identical request may be
replayed with the identical Stripe idempotency key. This window is intentionally
shorter than Stripe's documented minimum 24-hour key retention. It never creates
another key or attempt for the same donation. After 20 hours, a positive and
re-verified Stripe intent may be bound; if nothing is found, the donation stays
locked and needs investigation. Never delete or reset a reservation merely
because the application timed out, Stripe Search returned nothing, or the
idempotency key was pruned.

A successful signed `payment_intent.succeeded` may settle the exact reserved
attempt inside its MongoDB transaction. If the webhook wins, recovery observes
`paidAt` or the confirmed provider reference and refuses to overwrite it.
If recovery finds a successful Stripe intent, it binds the verified reference
but returns a pending-confirmation response rather than leaking a usable secret.
The signed webhook still owns monetary booking; delayed or missing webhooks
must be reconciled through the provider and controlled financial operations
before release. Do not synthesize a success event client-side.

## Isolated guest capability and key rotation

Set `GOZ_GUEST_PAYMENT_KEYS` in protected runtime environments only, e.g.
`v2:<base64url-of-32+-random-bytes>,v1:<previous-key>`.
Do not reuse `NEXTAUTH_SECRET`, `AUTH_SECRET`, Stripe keys or any
`NEXT_PUBLIC_*` value. The first key is used for new 60-minute HttpOnly,
SameSite=Lax, Secure-in-production cookies; each old key verifies *only*
older unexpired grants with its matching key ID. Keep a previous key configured
at least the full guest-grant TTL (plus deployment propagation margin) after
promoting a new one, then remove it. Do not disable all keys before draining
active guest checkouts. If key configuration is absent or malformed, guest
creation fails closed with 503; the application **must not** silently fall
back to login-signing secrets. Existing v1 cookies issued by the old,
login-secret-derived signer are deliberately not accepted; these guests must
restart checkout to acquire a new scoped grant.

Generate keys through your secrets manager and deploy them through its
protected Vercel environment settings; never commit key material. Coordinate
key promotions across every running instance to avoid validating a token
before all instances can read its key. Record the rotation event without
logging cookie values.

## Release blockers / rollback

Do not merge PR #197, #210, #211 or this stacked PR to `main`
until all gates pass: isolated MongoDB transaction and signed HTTP recovery
tests, protected CI and exact-commit Preview, approved Stripe Test Mode tests,
four-role authorization tests, verified backup/restore, provisioning and
index verification, and independent payment/security sign-off.

Monitoring: count reservations older than 5 minutes, provider searches
that returned multiple matches, requests after the 20-hour safe window,
and signed webhook retries. Preserve all provider references and audit
history. Do not delete or rewrite a live payment binding as a rollback action.
