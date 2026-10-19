# Communication suite transfer and review — 19 October 2026

## Provenance and scope

- Source repository: `saladin76/minberiaksa`.
- Source main inspected: `5b5a6ca539e86aef77fafaa14dbfc3ec6a4aab81`.
- Additional source work: open, unmerged PR #74, branch `fix/whatsapp-donation-parameters-20261019`, head `af9e807270104f9fa35b1048942310f1dcad6686`.
- Source PR history confirms the campaign engine, smart audience, analytics, inbox, sender routing, Meta studio and email/SMS hardening were merged into main. Main membership is evidence of integration, not independent proof of the currently deployed host revision.
- Target base: `AdhamRef/gozbebekleri`, main `5ad6d473f45a637de5125265d7f09427a88bf7d8`.
- Delivery branch: `feat/communication-suite-transfer`. No main update or production publication is part of this transfer.

The six requested sections are marketing campaigns, email, WhatsApp, WhatsApp conversations, SMS, and templates/triggers. Provider configuration is included because every send depends on it. Payment processing, donation-page routing and organization data are not copied from the source.

## Functional map

| Section | Imported behavior | Main dependency / verification |
| --- | --- | --- |
| Campaigns | Smart/manual/saved audiences, server-side selection, dry-run preview, language coverage, approval/schedule/send lifecycle, controls, pause/resume/archive, attribution | One resumable executor; persisted lease, cursor and progress; exact campaign UTM matching in comparisons |
| Email | Elastic Email facade, delivery archive, webhook/scheduled-event synchronization, engagement evidence, suppression and unsubscribe links, guarded retries | API configuration and sender readiness, provider acceptance separate from delivery |
| WhatsApp | Meta app and multiple WABA/number routing, template studio/import/sync/archive, exact approval by WABA and language, component-scoped variable bindings | Actual Meta category/approval/schema rechecked at send time |
| Conversations | Number-isolated threads, history, search/deep links, replies, attachments, 24-hour window handling, needs-reply state | Signed webhooks, per-number contact matching, server-side authorization |
| SMS | Turkish-number Netgsm routing and international Brevo routing, GSM7/UCS2 segmentation, campaigns/triggers, delivery state and retries | Explicit SMS consent and destination-specific provider availability |
| Templates/triggers | Eight event types across all three channels, translation variants, previews, variables, readiness preflight and readable errors | Existing template IDs/documents/triggers retained in the target database |

## Execution and failure behavior

1. An operator creates a draft campaign with an audience definition, not thousands of IDs uploaded by the browser. Large audiences resolve in pages.
2. Preflight checks the template, language coverage, sender, provider, contact and consent. A candidate count is not a delivery promise.
3. The ordinary campaign approval and scheduling workflow remains explicit. The migration itself creates no campaigns and performs no sends.
4. The executor acquires a persisted lease, renders each recipient's values, archives an attempt before the provider call, and persists progress. Contact deduplication prevents duplicate destinations within a campaign.
5. Quiet recipients enter a deferred queue; they do not stall every later recipient. Stop/pause/emergency controls are rechecked as work advances.
6. Provider acceptance becomes SENT; later callbacks/sync provide delivery, open, click, reply or failure evidence. Out-of-order callbacks cannot downgrade a later state. A webhook persistence error is distinguished from an already-processed duplicate.
7. Retries preserve the original delivery record and use a new linked attempt. Changed contacts, suppression, unavailable consent checks and uncertain provider outcomes remain guarded.
8. Automatic triggers share sender resolution with campaigns and retries. A routing refusal is final, rather than falling back to an unrelated default number.
9. Donation-scoped automatic events have recoverable dispatch leases. Recovery checks prior channel/template/donation attempts: it fills only channels with no archived attempt. Accepted, failed and uncertain existing attempts are left to normal guarded retry, never automatically replayed.

## Target-specific adaptations and additional corrections

### Identity, data and languages

- Preserve Gözbebekleri public routes, the eight enabled locales, branding, settings and existing template contents; there is no source database or credential import.
- Replace source-specific default website links and template examples with this site's domain and campaign route.
- Use the target's existing `/[locale]/campaign/[id-or-slug]` resolver for project-update messages. This resolver already accepts IDs and localized slugs.
- The project-update starter now offers all eight enabled languages and uses the target's existing blue/red palette. It is created only when an operator explicitly chooses that action.
- Keep existing receipt/document endpoints and authorization. Source-specific certificate serial generation, gift-delivery and waqf database subsystems are not imported as hidden dependencies of email dispatch. Those are separate donation features outside the six requested sections.
- The template context reads both campaign and category donation lines. The target has no `waqfItems` Prisma relation, so that relation is deliberately not queried. The pure projection remains compatible with such lines if a future feature supplies them.
- Existing live template records from the earlier template review are not overwritten by seeds or source templates.

### Money and attribution

- Original donation amounts and currency codes are retained. Currency formatting no longer rounds cents to whole units; currencies with three decimal digits remain supported.
- USD figures use the donation's stored `amountUSD` snapshot. An absent snapshot may use `amount` only when the original currency itself is USD. TRY/EUR/etc. are never relabelled as dollars, and today's FX rate is never substituted for the settlement snapshot.
- A missing conversion renders as unavailable rather than a fabricated zero in template variables. A history total with an unknown conversion is not presented as complete.
- Campaign comparisons show the sum of known USD snapshots and explicitly flag a partial total when conversions are missing. Attributed donation counts are preserved independently of conversion availability.
- Comparison attribution uses exact `utm_medium=communication` plus `utm_campaign=<campaign ID>` to avoid crediting the same donation to every campaign in a channel.
- The existing reporting reader is bounded to 180 days / 8,000 recent donations. Older/larger populations require a dedicated paginated historical reporting change; this transfer does not claim unlimited historical reporting.

### Delivery reliability and compatibility

- Notification work in existing payment callbacks/webhooks and verification endpoints now uses Next `after()` so a redirect/response does not abandon an unawaited notification promise. Charge amounts, provider validation and payment state transitions in those handlers are unchanged.
- Newly created OAuth/Google One Tap accounts dispatch USER_REGISTERED once; signing in to an existing account does not. Notification failure does not prevent login. This includes the previously prepared welcome-email fix from draft target PR #154.
- Keep Arabic-only template creation compatible with `translations: null`.
- Add the inbox route to the target navigation and a permission-gated needs-reply indicator. Opening conversation history closes the donor overlay.
- Preserve valid public impact URLs and the existing redirection work by leaving those files untouched.
- Transfer the source's scoped badge lookup to avoid evaluating the full donor database for every page of audience candidates.
- Transfer the tracking-link upsert correction: `$setOnInsert` and `$inc` no longer both write `saveCount`. The same pre-existing conflict was corrected for the conversion-event counter reached by event dispatch.
- Remove unused legacy Twilio import UI code; keep historical data and compatibility readers.

### Consent policy carried from the source

- Explicit do-not-contact blocks sending. Email and SMS retain their channel-specific opt-in requirements.
- The source's PR #74 deliberately does not require a stored internal WhatsApp opt-in flag for candidate eligibility. Missing profiles or `whatsappOptIn: false` alone do not exclude a WhatsApp candidate. This is code parity, not a consent backfill: no preferences are changed by this transfer.
- WhatsApp still requires a valid destination, the appropriate approved Meta category/template, correct business sender and the normal delivery guards. This application policy does not override provider enforcement.
- Marketing email unsubscribe links are signed, include a one-click header, and suppress later marketing. Existing complaint and hard-bounce handling is preserved.

## Database and configuration handoff

The Prisma changes are additive: SMS in MessageChannel, optional WhatsApp authentication metadata, exact/aggregate Meta variant collections, the donor-profile relation, email suppression, global send control and the deferred-recipient queue. No source donor, template or sender records are copied. No database migration was applied during this review.

Use the target environment, not the source institution's credentials. Required Meta app fields now include `META_WHATSAPP_APP_ID` and `META_BUSINESS_PORTFOLIO_ID`, in addition to token/app-secret/verify-token/Graph-version. The app owns credentials; each CommunicationSender owns its WABA and number. Inspect the target connection UI and verification result before enabling outbound work.

Prepared index workflow:

```sh
node --import tsx scripts/prepare-communication-suite.ts
# After reviewing the printed index plan against the target database:
node --import tsx scripts/prepare-communication-suite.ts --apply
```

The default is offline dry-run. Apply adds only the listed communication indexes. It performs no reset, record copy, message send or provider call. Existing duplicate data must be resolved deliberately if Mongo rejects a unique index; the script does not delete it.

Generate both Prisma clients through the existing build pipeline. Synchronize Meta templates from the target WABAs to populate exact approval variants; never copy another institution's approval state. Verify the target provider/webhook settings independently. No target provider reconfiguration or template republication was performed during this task.

Cron configuration merges with the target's existing jobs:

| Job | Schedule (UTC) |
| --- | --- |
| Communication executor | every minute |
| Email event synchronization | every 15 minutes |
| Meta template synchronization | every 15 minutes |
| Interrupted automatic dispatch recovery | every 5 minutes |
| Existing lapsed reminder | daily 09:00, unchanged |

`CRON_SECRET` remains the environment bearer authorization. Future cron runs after publication may perform configured work; no cron was invoked against production during this review.

## Fixture privacy

A source email regression fixture was explicitly described as a verbatim live event feed. That export was replaced by synthetic provider-shaped events, reserved example addresses, fixture message/transaction IDs and synthetic errors before publication. Provider-testing examples also use reserved charity domains. The manual-check WhatsApp sender fixture was also replaced with short synthetic WABA/app IDs and an explicitly invalid token. No live donor event feed or manual-check sender token is included in the transferred tests.

## Validation

Tests use isolated fixtures and mocked providers; they are not evidence of real inbox placement or a live Meta delivery.

- Prisma schema validation and generation: passed.
- Full integration suite: 436 passed, 0 failed.
- OAuth/Google One Tap notification tests: 3 passed.
- Changed React interfaces: ESLint reports 0 errors and 0 warnings across 48 TSX files.
- Strict communication/template/event graph and integration release checks: passed.
- Offline index-plan preview: passed; apply not run.
- Production build: passed, including optimized compilation, route-data collection, static generation and route listing. Used `next build --webpack`, offline placeholder OAuth/Stripe configuration, both generated Prisma clients, and a temporary two-worker limit to fit this review environment. The temporary worker setting was restored; no dummy values are saved to source or environment files.
- Full source-only TypeScript comparison: 174 pre-existing baseline errors before the transfer; 168 afterwards; no new source errors. Generated `.next` validation additionally exposes pre-existing route-signature issues outside this scope. The repository already skips whole-app type validation during Next builds; the imported communication/template/event dependency graph is checked separately in strict mode and passes.
- `git diff --check`: passed.
- Production main remains unchanged. No production database writes, provider sends, bulk retries or Meta template publication were performed.

## Live verification still required before publication

Use an isolated preview database and provider test destinations for the final operational check. Confirm the provider connection, WABA/number ownership and signed webhook, exact template language approval, a category-only donation context, decimal amount/currency, receipt link authorization, a 24-hour-window reply, and consent/suppression. Inspect the resulting archive before a real audience is scheduled. Production send testing and real inbox delivery were not performed here.
