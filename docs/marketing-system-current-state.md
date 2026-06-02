# Marketing system current state

This branch keeps the marketing and tracking cleanup intentionally small and safe.

## Completed in this branch

- Public layout mounts a single `MarketingRuntime` wrapper.
- `MarketingRuntime` owns tracking, attribution, referral capture, route page views, and final success-page browser conversion tracking.
- `SuccessFinalConversionTracker` writes shared browser dedupe keys so the legacy success page effect should not duplicate a final Meta Donate event after the unified tracker fires.
- Dashboard marketing labels are clearer while keeping the same routes and permission keys.
- A dedicated Repair Center was added at `/dashboard/marketing-intelligence/repair-center`.
- The Repair Center is visible in the dashboard nav under tracking and ads.

## Still intentionally pending

- Removing the old success page conversion effect after preview testing confirms the unified tracker covers all success-page cases.
- Adding platform capability labels to the health dashboard.
- Splitting the Marketing Intelligence page into cleaner sections.
- Building deeper platform sync for Google Ads, GA4, TikTok, and X.

## Safety rule

No Prisma schema changes are included in this branch.
