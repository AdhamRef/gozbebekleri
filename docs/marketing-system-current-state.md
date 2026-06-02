# Marketing system current state

This branch keeps the marketing and tracking cleanup intentionally small and safe.

## Completed

- Public layout now mounts a single MarketingRuntime wrapper.
- MarketingRuntime owns tracking, attribution, referral capture, route page views, and final success-page browser conversion tracking.
- SuccessFinalConversionTracker now writes shared browser dedupe keys so the legacy success page effect should not duplicate a final Meta Donate event after the unified tracker fires.

## Still intentionally pending

- Removing the old success page conversion effect.
- Renaming sidebar items.
- Adding platform capability labels to the health dashboard.
- Turning retry missing conversions into a repair center.

## Safety rule

No Prisma schema changes are included in this branch.
