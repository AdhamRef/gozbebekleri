# Communication, tracking, security and team systems

Source: saladin76/minberiaksa at 86d5908c5e56bdfea7985a7f6787a20bbd1cf3f9 (pinned snapshot).

Includes marketing campaigns, email/WhatsApp/SMS dashboards and inbox, templates and triggers, donor lists, tracking pixels and conversions, provider configuration, access policy and team permissions. Existing public content, donation routing, authentication providers and donor records are retained.

Only source code and additive schema definitions are transferred. No database export, communication templates from the production database, recipients, access rules, provider credentials, pixels or messaging accounts are imported.

## Project setup

Keep this project's DATABASE_URL and authentication configuration. Set APP_URL/NEXT_PUBLIC_SITE_URL to this project's origin. Set NEXT_PUBLIC_SYSTEM_LOGO_PATH to the project's own logo (default /logo.webp). Configure SYSTEM_ORG_LEGAL_NAME, SYSTEM_ORG_TAX_NUMBER, SYSTEM_ORG_ADDRESS and SYSTEM_ORG_CONTACT for receipt documents. No source-institution registration data or signatures are included.

Generate both Prisma clients. Review the additive schema change against a backed-up staging database before applying indexes. Configure providers and pixel IDs under the dashboard with this project's own accounts. Webhooks use this project's APP_URL; provider secrets stay in its encrypted integration settings. Enable the communication cron routes with this project's CRON_SECRET after verifying settings.

## Verification

npm run typecheck:ported-systems
npm run test:ported-systems

The dedicated verification workflow uses only fixture credentials and an unreachable fixture database. It runs schema validation, targeted TypeScript checks, isolated regression tests and production compilation. Live sends and payment captures are outside these checks.
