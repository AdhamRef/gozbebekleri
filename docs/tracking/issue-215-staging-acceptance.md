# Issue #215 — Clarity/GTM release gate (Draft only)

## Implementation
- Operator page: `/dashboard/platform-connections/tracking` > Pixels
- Existing `GET/PUT /api/admin/tracking` persists `clarityProjectId` and `clarityEnabled` alongside existing `googleTagManagerId` and `googleTagManagerEnabled`; `platformConnectionsManage` required for PUT. Successful saves append audit log entries.
- `GET /api/tracking/config` returns public IDs/enabled flags only, `Cache-Control: no-store`; it never returns access tokens.
- A missing database setting preserves historical live Clarity `u614k028k2` and GTM `GTM-MMNBQQWB` once during migration. Explicit disable overrides fallbacks.
- No GTM root-layout hardcoding/no competing `DeferredGTM` invocation; `TrackingPixels` is the single GTM loader, while `MicrosoftClarity` loads one session script on public pages only.
- UI distinguishes **configured** from **externally verified**; external verification is never inferred from saving or from the existence of a project ID.

## Staging verification (NOT EXECUTED — separate approved QA required)
1. Record the Vercel project ID and prove it is not the production project `prj_hkMyu8iABc7AAqF7T1DvYRpKYRqV`. Verify independent MongoDB cluster identity, credentials and network allowlist.
2. Use a QA-only Clarity project and GTM container. Make the GTM container tag inventory available for review in Tag Assistant; ensure no GTM Clarity / GA4 / Ads purchase tags duplicate direct site dispatch.
3. Sign in as ADMIN, STAFF without `platformConnectionsManage`, STAFF read-only and DONOR; verify GET/PUT HTTP permissions. Test invalid IDs, saving IDs, reloading, disabling, reloading again and re-enabling.
4. Open a **public staging page**, not dashboard. Use Browser DevTools Network to assert one `clarity.ms` recorder request, one `gtm.js?id=` request, and at most one direct `gtag/js` script. Check page navigation/remount.
5. Repeat on Arabic RTL desktop/mobile and Turkish/English views. Ensure admin dashboard itself starts neither recorder nor tag manager.
6. Check Clarity dashboard using **synthetic QA sessions**. Changing a project ID should require a page reload/new visit; a previously started recorder cannot be revoked retroactively by changing a DB record.
7. Validate the GTM container tags against site-owned GA4 and Ads. In a **nonfinancial fixture** representing one verified paid donation, assert exactly one canonical purchase/conversion per provider and matching `event_id` / `transaction_id`; do not execute real charges or send donor information.
8. Keep a reviewed network capture (redact IPs/cookies) and GTM tag inventory proving Clarity, GA4 and Google Ads are not injected a second time. Network verification is not satisfied by local unit/HTTP fixtures.
9. Confirm no new Google/Meta events fire on donation checkout/failure or optimistic `PAID` placeholder. Final success conversions remain owned by `SuccessFinalConversionTracker` and server-confirmed payment payload; Stripe Webhook/PaymentIntent code is untouched.

## Current blockers
- Separate Vercel QA project permission (Create Project), isolated MongoDB staging with replica set and restore drill, and Stripe Test Mode / Webhook credentials remain unavailable.
- This tracking PR does not authorize live or shared-Preview writes.
- The `main` tree contains an unrelated unresolved merge marker in `app/api/messages/route.ts`; full staging build on this branch requires the upstream build fix to be approved separately.
- Finance/security reviewers must approve deduplication evidence and privacy/consent configuration before enabling recorders on Production.

## Consent and SPA privacy gate (new acceptance condition)
- Session recording is **fail-closed** unless a site-approved CMP writes the exact localStorage value `goz_analytics_consent=granted` after explicit visitor consent. Missing/denied values skip SDK initialization.
- A recorded consent granted at rest is not itself proof of legal/technical consent collection: approve CMP integration and consent withdrawal UX before any Production enabling.
- Account, admin, auth, donation checkout, payment, success, receipt and subscription paths are excluded from Clarity initial recording. SPA entry after an existing public recording issues a best-effort `clarity('stop')`, but **requires network validation** that this genuinely halts capture. Without that validation, fail the release gate rather than assuming masking is enough.
- The original Clarity project and GTM IDs remain configured during migration; withholding session replay until consent is explicit intentionally changes recording behavior for privacy protection.
- Test both entry directly on sensitive pages and navigation from a consenting marketing page into a sensitive page; ensure no Clarity payloads containing user names, email addresses, donation amounts or tokenized URLs.
