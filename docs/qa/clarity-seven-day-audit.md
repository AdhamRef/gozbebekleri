# Gözbebekleri Clarity seven-day audit

## Status and evidence boundary

**DATA_ACCESS_BLOCKED.** No authorized Microsoft Clarity project/team dashboard or redacted, date-filtered recording/event export was available in this task. No replay, dashboard, heatmap, or production analytics was accessed. Consequently there are no observed session counts, live event rates, replay findings, or donation-conversion rates in this report. Source inspection is not evidence that a visitor experienced a failure. Do not treat a recordings CSV index as proof that its replay or event timeline was viewed.

The requested review window at execution time was **2026-11-02 17:09:33.577 UTC through 2026-11-09 17:09:33.577 UTC**, equivalent to **2026-11-02 20:09:33.577 through 2026-11-09 20:09:33.577 Europe/Istanbul (UTC+03:00)**. These are rolling boundaries; the requested calendar-date label is 2026-11-02 through 2026-11-09 inclusive.

## Institution and project separation

- The application identifies itself as Gözbebekleri / قرة العيون and its canonical site URL is `https://www.gozbebekleri.org` (`app/layout.tsx`).
- `components/MicrosoftClarity.tsx` initializes Clarity with `NEXT_PUBLIC_CLARITY_ID` or the hard-coded fallback `u614k028k2`.
- `lib/tracking/clarity-config.ts` has an empty default and validates an explicitly configured ID; the tracking settings link and `components/dashboard/ViewUserProfileDialog.tsx` use that separate configuration path, with the latter also containing the fallback.
- The issue reports that the same fallback appears in YediCihan's loader; that cross-repository claim was not independently verified from this checkout.
- Production `NEXT_PUBLIC_CLARITY_ID`, the actual Clarity project's authorized domains, and whether the same project receives YediCihan traffic could not be verified. YediCihan's deployment/configuration was not accessible from this repository.
- **Unresolved potential P0 measurement-segregation/privacy risk:** the fallback appears in this repository but project ownership/domain association is unverified. If `u614k028k2` or the production project receives both institutions' traffic, treat it as a P0 segregation issue. Confirm the production environment variable and the Clarity project's domain allowlist with institution owners before drawing conclusions. Do not change project IDs, tracking settings, or deploy a tracking change based on this source-only review.

## Source-level instrumentation audit (not replay findings)

`app/layout.tsx` mounts `MicrosoftClarity` and `EngagementInstrumentation` at the root, so the source does not establish a public-route-only scope. `lib/analytics.ts` forwards engagement events to Clarity, GA4, and the GTM data layer (except its GTM leg on `/success` and `/donation-failed`).

The source-defined custom events are `landing_page_view`, `page_view_change`, `page_became_hidden`, `page_visible_again`, `first_scroll`, `first_click`, `rage_click`, and `outbound_link_click`. The app's `rage_click` is its own pointerdown heuristic (three or more pointerdowns within one second and a 50-pixel radius), not proof of Clarity's built-in rage-click signal. This source review found no Clarity event calls for dead clicks, quick backs, validation errors, repeated submissions, checkout steps, payment failures, cancellations, or pending/settled donations. Their absence from app-defined custom events does not establish whether Clarity's built-in analytics or another tag captures them.

Potential data-minimization review items, not evidence that Clarity retained sensitive values:

- `EngagementInstrumentation` sends the full initial `document.referrer`, arbitrary route search parameters on client navigation, and external anchor `href` values through `trackEngagement`; `trackEngagement` copies string values to Clarity tags. Review/redact query strings and token-bearing URLs before any future instrumentation change, with privacy/QA approval.
- UTM and click-ID values are set as Clarity tags. These values should be treated as attribution data; confirm the approved collection policy and avoid copying raw values into findings.
- The source calls a session-level custom `rage_click` heuristic; it does not demonstrate built-in Clarity rage-click counts or replay evidence.

Donation source paths include campaign/category/impact dialogs and cart checkout (`components/DonationDialog.tsx`, `components/CartPaymentDialog.tsx`), Stripe and PayFor components/routes, recurring monthly donations, and localized success/failure pages. `components/SuccessFinalConversionTracker.tsx` polls the donation tracking endpoint and emits browser conversion events only after an `ok: true` response; the success page checks confirmed-payment state before showing its paid-state confetti. These pixel/conversion paths are not Clarity funnel events and a success/thank-you route alone must not be counted as settled payment.

The source indicates eight locales (ar, en, fr, tr, id, pt, es, de) in `app/layout.tsx`. Since instrumentation is mounted globally and has no visible dashboard exclusion, admin-route tracking is a source-level possibility; actual dashboard recording must be checked only in the authorized project.

## Import a redacted export locally

Use only a project-team-authorized, redacted export. Keep the export and output on an approved local machine; do not commit them, upload them, or paste them into an issue/PR. The parser reads CSV indexes/timelines only and does not fetch recording links or contact a provider. It emits only row denominators, HMAC-derived session evidence keys, Istanbul day/hour, coarse route templates, coarse device/browser/OS categories, event labels that pass a strict identifier allowlist, and event offsets. It does not emit URLs, query strings, raw IDs, names, email/phone fields, or unknown CSV columns. Keyed evidence remains sensitive pseudonymous data and must remain private.

Read a private random key into the local environment without putting it in shell history or the command line, then pass session and event CSVs as arguments:

```sh
read -rs -p "Private audit HMAC key: " CLARITY_AUDIT_HMAC_KEY
export CLARITY_AUDIT_HMAC_KEY
printf '\n'
node --import tsx scripts/audit-clarity-export.ts /private/path/sessions.csv /private/path/events.csv > /private/path/inventory.json
unset CLARITY_AUDIT_HMAC_KEY
```

The key must be at least 32 characters, must not be shared or committed, and the inventory must not be committed. A recordings CSV is only an index. The parser's row counts describe only the supplied files; they do not prove export completeness, replay availability, or that a replay/timeline was inspected. Keep export provenance, requested filters, row denominators, omitted/undated rows, and review coverage in the private audit record.

## Findings record (complete only with authorized evidence)

For each observed item, record:

| Field | Required value |
|---|---|
| Finding ID / severity | P0, P1, or P2; distinguish observed behavior from telemetry noise and hypotheses |
| Evidence | Istanbul day/hour, normalized route, device/browser, event type and timeline offset, HMAC evidence key |
| Coverage | Available sessions, sessions inspected, event rows, replay links accessible, and sample denominator |
| Reproduction | Replay steps and observed result; state when not reproducible |
| Impact | Affected sessions / inspected sample, business consequence, and affected one-time/recurring/payment path if evidenced |
| Cause / fix | Probable cause explicitly marked **hypothesis** until reproduced; proposed fix and owner |

Never include recording URLs, user/session IDs, donor details, full query strings, payment identifiers, raw events, or personal fields. Do not publish “anyone with link” recordings.

## Review protocol when access is granted

1. Verify institution ownership, production project ID, allowed domains, and export project scope separately before looking at analytics. Record only verification status and date—not tokens or credentials. Stop and escalate if domains are mixed.
2. Export the exact rolling boundary above (or recalculate and record exact UTC/Istanbul boundaries at review time). Inventory all supplied sessions and events; reconcile the index denominator, export-row denominator, and accessible replay denominator. Record the date coverage and every limitation.
3. Inventory all available custom/Smart Event names and definitions, GA4/GTM duplicates, dashboards, recording filters, and heatmaps/scroll/click maps for donation routes, amounts, CTA locations, error pages, and forms. Separate built-in Clarity signals from custom app events and from inferred behavior.
4. Inspect the event timeline, actions, URL transitions, and performance values in each selected authorized replay. Review checkout and payment-return paths first, including one-time/recurring, pending/failure/cancel, provider, device, and locale. Then cover routes and remaining alert types.
5. If not every accessible replay can be viewed, state the selection rule before sampling. Inspect all high-impact funnel/error strata first, then take a deterministic, documented sample within each remaining day × route × device/browser stratum. Report selected and inspected counts per stratum; never imply that the sample is the full population.
6. Compare traffic with actual settled donations only if permissioned aggregate finance evidence is available. Do not access raw donor records. Never treat a thank-you page or client event as settlement evidence.

## Prioritized issue-ready backlog

1. **P0 — Verify Clarity project segregation.** Obtain owner-confirmed production configuration and project domain association for Gözbebekleri and YediCihan. If they share a project, stop analysis across mixed domains and escalate the privacy/measurement incident; change IDs only after institution-specific ownership is verified.
2. **P1 — Review sensitive URL/referrer telemetry.** With privacy and QA approval, assess query-string, referrer, and outbound-href values forwarded to Clarity/GA4/GTM; propose allowlisting/redaction only after test coverage and review. No telemetry changes are made by this audit.
3. **P1 — Add a verified conversion funnel definition.** Once dashboard access and event definitions are confirmed, document sponsor/case selection and orphan sponsorship flows, amount/currency, cart/checkout, Stripe/PayFor and bank redirects, retry/cancel, recurring, and settlement states. Keep Clarity instrumentation distinct from canonical finance and conversion PRs #195/#197; do not create GA4 Purchase/Donate events from this audit.
4. **P2 — Replay and UX review.** After a privacy-safe export is available, document observed dead/rage clicks, quick backs, form errors, performance, blank screens, and heatmap/scroll findings with route, environment, event offset, denominator, and reproducible evidence.
5. **P2 — Close coverage gaps.** Verify admin-route scope, all eight locales, Clarity/GA4/GTM duplicates, and event definitions; add a source instrumentation change only through a separate reviewed QA decision.

Canonical finance work (#195/#197), donor records, ads/pixels, payment behavior, and production logging settings are outside this audit's change scope.
