# Gözbebekleri — Snapshot of all remote branches (2026-11-09)

**Repository:** `AdhamRef/gozbebekleri`  
**Reference main:** `0105005cbfa07b521cbc3975080ccdd7c68fc842`  
**Canonical release candidate:** `audit/goz-round2-idempotency-locale-20261109` at `289244f5f090d18ed90deeeff7112faaf165603c`

This is a **Git ancestry inventory**, not a blanket declaration that unrelated branches are absent from main. Squash merges, cherry-picks, refactors, and deliberately removed features can make a branch tip non-ancestral even when its feature is already in main. In particular, `INDEPENDENT_OR_STALE` is **NOT permission to merge**.

- `ALREADY_MAIN`: branch tip is ancestor of main. Safe to leave untouched; no merge required.
- `STACKED_PR195`: branch tip is included in the canonical release PR. Do not merge it a second time.
- `INDEPENDENT_OR_STALE`: not ancestral to either reference. Requires feature-level comparison against current code; many are obsolete/squashed already.

**Total verified remote branches:** 99. Classification counts: ALREADY_MAIN=16; STACKED_PR195=4; INDEPENDENT_OR_STALE=78.

| Branch | Git ancestry classification |
|---|---|
| `add-archive-asset-review-actions-ui` | INDEPENDENT_OR_STALE |
| `add-archive-asset-task-action-ui` | INDEPENDENT_OR_STALE |
| `add-archive-asset-to-brand-assets` | INDEPENDENT_OR_STALE |
| `add-archive-content-item-action-ui` | INDEPENDENT_OR_STALE |
| `add-archive-drive-link-actions` | INDEPENDENT_OR_STALE |
| `add-archive-setup-actions` | INDEPENDENT_OR_STALE |
| `add-brand-asset-api` | INDEPENDENT_OR_STALE |
| `add-brand-asset-manual-authoring` | INDEPENDENT_OR_STALE |
| `add-brand-asset-verification-actions` | INDEPENDENT_OR_STALE |
| `add-brand-color-authoring` | INDEPENDENT_OR_STALE |
| `add-brand-font-authoring` | INDEPENDENT_OR_STALE |
| `add-brand-guideline-authoring` | INDEPENDENT_OR_STALE |
| `add-brand-message-framework-authoring` | INDEPENDENT_OR_STALE |
| `add-calendar-event-task-actions` | INDEPENDENT_OR_STALE |
| `add-calendar-planning-task-actions` | INDEPENDENT_OR_STALE |
| `add-campaign-link-management-actions` | INDEPENDENT_OR_STALE |
| `add-content-item-publishing-status-actions` | INDEPENDENT_OR_STALE |
| `add-content-plan-task-action` | INDEPENDENT_OR_STALE |
| `add-content-production-task-save` | INDEPENDENT_OR_STALE |
| `add-dashboard-prisma-slice-validation` | INDEPENDENT_OR_STALE |
| `add-donor-reactivation-foundation` | INDEPENDENT_OR_STALE |
| `add-operation-task-create-edit-forms` | INDEPENDENT_OR_STALE |
| `add-operation-task-transition-controls` | INDEPENDENT_OR_STALE |
| `add-operations-publishing-checklist` | INDEPENDENT_OR_STALE |
| `add-production-board-task-action` | INDEPENDENT_OR_STALE |
| `add-safe-operation-task-mutations` | INDEPENDENT_OR_STALE |
| `add-scheduler-manual-publication-actions` | INDEPENDENT_OR_STALE |
| `add-scheduler-manual-ready-state` | INDEPENDENT_OR_STALE |
| `add-season-readiness-task-action` | INDEPENDENT_OR_STALE |
| `add-weekly-theme-task-action` | INDEPENDENT_OR_STALE |
| `agent/campaign-create-correctness` | ALREADY_MAIN |
| `agent/marketing-five-pages-refactor` | INDEPENDENT_OR_STALE |
| `agent/operatio...[truncated]` | INDEPENDENT_OR_STALE |
| `cut-over-brand-profiles-repository-storage` | INDEPENDENT_OR_STALE |
| `cut-over-operation-tasks-repository-storage` | INDEPENDENT_OR_STALE |
| `dashboard-db-contracts-foundation` | INDEPENDENT_OR_STALE |
| `dashboard-recent-donations-attribution-fields` | INDEPENDENT_OR_STALE |
| `document-stale-dashboard-pr-audit` | INDEPENDENT_OR_STALE |
| `enable-operations-content-filters` | INDEPENDENT_OR_STALE |
| `exec-overview-v1` | INDEPENDENT_OR_STALE |
| `executive-system-overview-v1` | INDEPENDENT_OR_STALE |
| `feat/campaign-link-registry-save` | INDEPENDENT_OR_STALE |
| `feat/communication-suite-transfer` | ALREADY_MAIN |
| `feat/content-editors-ai-20261019` | ALREADY_MAIN |
| `feat/donor-subscription-requests-20261107` | STACKED_PR195 |
| `feat/marketing-intelligence-system` | INDEPENDENT_OR_STALE |
| `feat/marketing-tracking-transfer` | INDEPENDENT_OR_STALE |
| `feat/profile-financial-parity-and-requests-plan-20261107` | STACKED_PR195 |
| `feat/unified-advanced-settings-20261021` | ALREADY_MAIN |
| `feature/donation-abuse-guard-20261109` | INDEPENDENT_OR_STALE |
| `fix-paid-click-id-persistence` | INDEPENDENT_OR_STALE |
| `fix-persist-fbclid` | INDEPENDENT_OR_STALE |
| `fix/advanced-settings-save-20261021` | ALREADY_MAIN |
| `fix/category-publication-default-20261021` | ALREADY_MAIN |
| `fix/clean-impact-urls` | ALREADY_MAIN |
| `fix/comprehensive-site-audit-20261021` | ALREADY_MAIN |
| `fix/content-model-parity-20261020` | ALREADY_MAIN |
| `fix/content-row-action-labels` | ALREADY_MAIN |
| `fix/content-workspace-quality-and-safe-delete` | ALREADY_MAIN |
| `fix/disable-gtm-on-conversion-pages` | INDEPENDENT_OR_STALE |
| `fix/donor-reactivation-summary` | INDEPENDENT_OR_STALE |
| `fix/email-template-events` | INDEPENDENT_OR_STALE |
| `fix/explicit-order-save-20261021` | ALREADY_MAIN |
| `fix/footer-localization-audit` | ALREADY_MAIN |
| `fix/goz-report-profile-settlement-20261108` | STACKED_PR195 |
| `fix/goz-round2-atomic-stripe-20261109` | STACKED_PR195 |
| `fix/localization-pre...[truncated]` | ALREADY_MAIN |
| `ops-system-roadmap` | INDEPENDENT_OR_STALE |
| `ops/add-guarded-comment-trigger-bootstrap-dispatcher` | INDEPENDENT_OR_STALE |
| `ops/add-one-shot-bootstrap-dispatcher` | INDEPENDENT_OR_STALE |
| `ops/auto-trigger-vercel-bootstrap` | INDEPENDENT_OR_STALE |
| `ops/complete-pr127-lockfile-repair-bootstrap` | INDEPENDENT_OR_STALE |
| `ops/diagnose-temporary-vercel-bootstrap` | INDEPENDENT_OR_STALE |
| `ops/direct-guarded-pr127-trigger` | INDEPENDENT_OR_STALE |
| `ops/finalize-pr127-lockfile-gate` | INDEPENDENT_OR_STALE |
| `ops/fix-bootstrap-dependency-install` | INDEPENDENT_OR_STALE |
| `ops/fix-temporary-vercel-bootstrap` | INDEPENDENT_OR_STALE |
| `ops/make-pr127-repair-runner-self-healing` | INDEPENDENT_OR_STALE |
| `ops/pin-bootstrap-node-npm` | INDEPENDENT_OR_STALE |
| `ops/remove-one-shot-bootstrap-dispatcher` | INDEPENDENT_OR_STALE |
| `ops/remove-temporary-bootstrap-dispatcher` | INDEPENDENT_OR_STALE |
| `ops/repair-pr127-lockfile` | INDEPENDENT_OR_STALE |
| `ops/repair-pr127-lockfile-bootstrap-runner` | INDEPENDENT_OR_STALE |
| `ops/temporary-vercel-bootstrap` | INDEPENDENT_OR_STALE |
| `ops/trigger-final-pr127-lockfile-repair` | INDEPENDENT_OR_STALE |
| `ops/trigger-pr127-from-deployment-status` | INDEPENDENT_OR_STALE |
| `ops/use-direct-guarded-trigger-pr127` | ALREADY_MAIN |
| `ops/use-direct-guarded-trigger-pr127-repair` | ALREADY_MAIN |
| `package-1-core-ai-scheduler-brand` | INDEPENDENT_OR_STALE |
| `package-2-conversion-timeline-ui` | INDEPENDENT_OR_STALE |
| `package-2-tracking-truth-timeline` | INDEPENDENT_OR_STALE |
| `package-2-tracking-truth-v1` | INDEPENDENT_OR_STALE |
| `package-2b-tracking-runtime-cleanup` | INDEPENDENT_OR_STALE |
| `package-3-campaign-operating-system` | INDEPENDENT_OR_STALE |
| `package-3-campaign-registry-foundation` | INDEPENDENT_OR_STALE |
| `persist-archive-asset-review-actions` | INDEPENDENT_OR_STALE |
| `persist-archive-asset-task-assignment` | INDEPENDENT_OR_STALE |
| `persist-archive-collections-projects` | INDEPENDENT_OR_STALE |
| `INDEPENDENT_OR_...[truncated]` | INDEPENDENT_OR_...[truncated |

**No branch deletion, force-push, reset of repository history, or production merge is performed by this snapshot.** The main question for remaining independent branches is whether their *individual functions* already exist in the latest main or remain necessary.
