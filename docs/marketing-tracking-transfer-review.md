# Marketing and platform connection transfer

## Scope and provenance

Source: saladin76/minberiaksa main at 5b5a6ca539e86aef77fafaa14dbfc3ec6a4aab81.
The relevant refactor was merged by source PR #45 (c58f741); no open PR matching tracking was found during review.
Target base: AdhamRef/gozbebekleri main at 3d0c50b87e9712eaf4acb6529543c520fdba868d.
Delivery branch: feat/marketing-tracking-transfer. Production merge and publication are outside this change.

The screenshot identifies Marketing > Links & Attribution, Tracking & Conversions,
and Platform Connections > Tracking Pixels, Communication Providers, Connection Health.
Communication providers were already transferred by target PR #155; this change
retains that implementation and improves its shared health and display surfaces.

## Functional ownership

| Page | Responsibility | Permission |
| --- | --- | --- |
| /dashboard/marketing/attribution | Link creation, multilingual resource selection, UTM/ad identifiers, performance, edit/archive/soft delete/restore | referrals; export additionally reportsExport |
| /dashboard/marketing/tracking | Conversion archive, per-donation timeline, filters and delivery evidence | pixels; retry additionally platformConnectionsTest |
| /dashboard/platform-connections/tracking | Pixel and server API settings, masked secrets, explicit tests and diagnostics | platformConnections; mutate platformConnectionsManage; test platformConnectionsTest |
| /dashboard/platform-connections/communication | Existing sender/provider configuration from PR #155 | Existing integration permission hierarchy unchanged |
| /dashboard/platform-connections/health | Configured versus verified versus failed/disabled evidence | platformConnections; recheck platformConnectionsTest |

## Transfer and target adaptation

- Copy source canonical components and APIs; preserve target database records,
  credentials, domains, all eight configured public locales and currency choices.
- Keep target link-generator data API, including NOT_IMPACT_BACKING filtering.
  No source resource IDs, slugs, donor records or account credentials are copied.
- Keep target public routing, impact URL redirection, donation/payment handlers,
  webhook signatures, provider runtime and schema unchanged.
- Legacy pixels, conversion-events and link-generator page implementations become
  redirects to canonical pages. Existing Next redirects remain intact.
- Read tracking settings through the existing single TrackingSettings reader.
  Empty/masked secret inputs keep saved secrets; removal requires a clear flag.
  Audit entries include non-secret before/after fields and secret-change flags only.
- Source-only Meta test URL is replaced by the target domain; synthetic event email
  uses example.org. No test event or conversion retry was submitted.
- Unsupported live tests return 501/not_implemented rather than simulated success.
  GA4 debug validation messages now prevent a false success from HTTP 200 alone.

## Additional review corrections

1. Compose settled-donation and paidAt range predicates with AND. The source spread
   order otherwise overwrote the selected paidAt range with a non-null predicate.
2. Use the existing stored-USD helper. Keep decimals and flag unknown conversions
   as a partial total; averages use only donations with a known USD value.
   No current FX substitution and no database backfill.
3. Mark the 5,000-donation reporting read cap explicitly. Conversion totals precede
   the UI display slice; mark saturated read windows as inexact/lower-bound results.
4. Prevent saving/testing defaults when tracking settings fail to load.
5. Export requires both referrals and reportsExport.
6. A historical successful provider test does not override currently missing
   configuration. Configured is distinct from verified and from real delivery.

## Validation design

A new isolated regression suite executes real route/service source with mocked
Prisma, sessions and providers. It covers denied-before-read/body/send ordering,
read-only versus mutate/test permissions, secret preservation and removal,
secret-safe auditing, unsupported tests, GA4 validation, conversion totals and
deduplication, export authorization, diagnostics toggles, provider health,
paidAt range composition and partial USD revenue.

The focused strict gate is tsconfig.marketing-tracking.json; it includes all
transferred interfaces, pages, handlers and services. Existing integration and
release checks remain active. No check is disabled by this transfer.

## Operational limits

No production write, provider test, message, conversion retry, pixel change,
audience send or database migration is performed. Provider acceptance still does
not prove receipt. Reporting remains bounded; rows can match multiple saved links,
so link totals are attribution views and are not an exclusive finance ledger.
Live authenticated dashboard verification and controlled provider tests remain
separate operational checks.
