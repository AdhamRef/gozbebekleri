# Dashboard System Status

آخر تحديث: 2026-06-22

## ما تم إدخاله إلى main

- Campaign Registry save flow من Link Generator.
- Campaign Links management actions: Copy, Archive, Restore, Logical Delete, Details, Performance anchors.
- Campaign Link Detail intelligence مع Missing Identifiers وRecommended Actions.
- Tracking Truth داخل Campaign Link Detail كتشخيص قراءة فقط للـ ConversionEvent.
- Operations Persistence Foundation مع repository/service contracts للـ Scheduler, Production, Archive, Content Items, Tasks.
- Shared AI Core readiness لسياقات marketing, content, archive, brand مع tool contracts وprovider fallback وaudit log foundation.
- Dashboard hardening patch: no-store responses، صلاحيات أوضح، وOperations API guards.
- Brand Center foundation: profiles, assets, colors, typography, voice rules, message frameworks, downloads, and safe Brand AI guard actions.
- Smart Archive foundation: `/dashboard/archive` with Collections, Projects, Drive Links, Assets Review, Marketing Picks, Reports Archive, Archive AI, and no-store archive APIs.
- Dashboard DB contract registry, status page, and read-only status API.
- Provider catalog metadata for Google Drive, Google Picker, storage, video frame extraction, and OpenAI readiness.
- Open PR audit documenting stale dashboard PRs that are already covered or superseded.
- First dashboard Prisma models appended to `prisma/schema.prisma`.
- Brand profiles/colors/guidelines cut over to DB-backed read with foundation fallback.
- Archive collections/projects cut over to DB-backed read with foundation fallback.
- OperationTask cut over to DB-backed read/write API with computed foundation fallback.
- `/dashboard/operations/tasks` now has DB-backed manual task creation, safe quick edit, and daily transition controls for real OperationTask rows.
- `BrandAsset`, `BrandFont`, `BrandMessageFramework`, and `AiOperationRun` staged contracts added to `prisma/dashboard-foundation.schema.prisma` only.
- Operations/content workflow staged contracts added to `prisma/dashboard-foundation.schema.prisma` only.
- Brand Center assets, typography, and message frameworks are sourced through the Brand repository snapshot, with optional Prisma delegate read fallback when generated delegates exist.
- Smart Archive Drive links/assets/video frames are sourced through the Archive repository snapshot, with optional Prisma delegate read fallback when generated delegates exist.
- Shared AI Core audit logging has optional `AiOperationRun` persistence fallback when generated delegates exist.
- Archive Asset `Assign Task` creates a real `OperationTask` through the Operations task repository when DB is available, with AuditLog on success.
- Archive Collections and Projects APIs create real runtime rows through Prisma-backed repository services.
- Archive Drive Links POST persists link metadata as DB-backed `AuditLog` records with `entityType = ArchiveDriveLink`, and GET reads persisted link metadata through the archive repository snapshot until a runtime delegate exists.
- Archive Drive Link create path is prepared to use a future `archiveDriveLink` runtime delegate once `ArchiveDriveLink` is appended to `prisma/schema.prisma`; until then it stays audit-backed and performs no external calls.
- `/dashboard/archive/drive-links` validates Drive URLs in the UI, identifies folder/file style links before save, and blocks non-Google-Drive links before POST.
- `/api/admin/archive/drive-links` now validates required fields server-side and rejects non-Google-Drive URLs even if the UI is bypassed.
- Archive Asset review actions persist approval/rejection state as DB-backed `AuditLog` records with `entityType = ArchiveAsset`, and list/detail APIs read the saved state through the archive repository snapshot.
- Archive Asset `Create Content Item` saves a DB-backed AuditLog content item proposal and Operations reads it in `/dashboard/operations/content`.
- `/api/dashboard/operations/items` supports guarded no-store `GET`, `POST`, and `PATCH` for audit-backed content items.
- `/dashboard/operations/content` has a usable content item creation panel and persisted item status transitions to `REVIEW` / `APPROVED`.
- `/api/admin/brand/assets` supports guarded no-store `GET` and `POST` for manual BrandAsset URL records.
- `/dashboard/brand/assets` has a usable manual asset creation panel for logos, templates, certificates, watermarks, and brand guides.
- Brand repository reads audit-backed BrandAsset records and merges them with foundation/runtime Brand assets.
- Saved BrandAsset records are marked `TO_VERIFY` by default and include safety markers: `externalCall: false`, `uploadPerformed: false`, `downloadPerformed: false`, `autoPublish: false`, `aiGenerated: false`, and `humanReviewRequired: true`.
- `/api/admin/brand/colors` supports guarded no-store `GET` and `POST` for real `BrandColor` rows.
- `/dashboard/brand/colors` has a usable manual color creation panel with HEX validation, usage selection, order, feedback, refresh, and Copy HEX.
- New BrandColor rows are saved through Prisma with best-effort AuditLog using `action = brand.color.create`.
- `/api/admin/brand/guidelines` supports guarded no-store `GET` and `POST` for real `BrandGuideline` rows.
- `/dashboard/brand/voice` has a usable manual guideline creation panel for voice, copy, proof, donor dignity, CTA, and localization rules.
- New BrandGuideline rows are saved through Prisma with best-effort AuditLog using `action = brand.guideline.create`.
- `/api/admin/brand/frameworks` supports guarded no-store `GET` and `POST` for audit-backed `BrandMessageFramework` records until the runtime delegate exists.
- `/dashboard/brand/frameworks` has a usable manual message framework creation panel for Friday, thank-you, zakat, waqf, emergency, donor reactivation, Ramadan, and general frameworks.
- Brand repository reads audit-backed BrandMessageFramework records and merges them with foundation/runtime frameworks.
- `/dashboard/operations/content` content-item cards expose `SCHEDULED` and `PUBLISHED` status transitions in addition to `REVIEW` and `APPROVED`.
- `PUBLISHED` is explicitly a manual status update only; the UI confirms that no automatic sending or publishing happens.

## ما يتم تجهيزه في الحزمة الحالية

- `/api/admin/brand/fonts` supports guarded no-store `GET` and `POST` for audit-backed `BrandFont` records until the runtime delegate exists.
- `/dashboard/brand/typography` has a usable manual font creation panel for heading, body, Arabic UI, and campaign typography rules.
- Brand repository reads audit-backed BrandFont records and merges them with foundation/runtime fonts.
- New BrandFont records use DB-backed AuditLog with `action = brand.font.manual-create`.
- Font creation records safety metadata: `externalCall: false`, `fileDownloaded: false`, `autoPublish: false`, `aiGenerated: false`, and `humanReviewRequired: true`.
- No file upload, file download, Google Drive sync, AI generation, publishing, sending, payment changes, tracking runtime changes, external platform calls, or frontend secrets.

## المسارات الرئيسية

- `/dashboard/system-overview`
- `/dashboard/marketing`
- `/dashboard/marketing/campaign-operating-center`
- `/dashboard/marketing/campaign-links`
- `/dashboard/marketing/campaign-links/[id]`
- `/dashboard/marketing/ai-assistant`
- `/dashboard/marketing/tracking-hub`
- `/dashboard/marketing/connections`
- `/dashboard/conversion-events`
- `/dashboard/conversion-events/timeline`
- `/dashboard/conversion-events/retry-truth`
- `/dashboard/operations`
- `/dashboard/operations/command-center`
- `/dashboard/operations/scheduler`
- `/dashboard/operations/production`
- `/dashboard/operations/archive`
- `/dashboard/operations/tasks`
- `/dashboard/operations/content`
- `/dashboard/operations/system`
- `/dashboard/operations/system/db-contracts`
- `/dashboard/operations/ai-assistant`
- `/dashboard/operations/archive/ai-assistant`
- `/dashboard/archive`
- `/dashboard/archive/collections`
- `/dashboard/archive/projects`
- `/dashboard/archive/drive-links`
- `/dashboard/archive/assets`
- `/dashboard/archive/marketing-picks`
- `/dashboard/archive/reports`
- `/dashboard/archive/ai`
- `/dashboard/brand`
- `/dashboard/brand/organizations`
- `/dashboard/brand/assets`
- `/dashboard/brand/colors`
- `/dashboard/brand/typography`
- `/dashboard/brand/voice`
- `/dashboard/brand/frameworks`
- `/dashboard/brand/downloads`

## ما بقي foundation

- Operations Scheduler, Production, and Content Workflow Tasks ما زالت foundation/repository-backed وليست DB-backed بالكامل.
- Operations Content Items: manual items and Archive-created proposals are audit-backed and visible/editable in Operations, but the dedicated runtime `ContentItem` model is still pending.
- Operations Tasks: `OperationTask` DB-backed read/write API وUI create/edit/transitions موجودة للمهام الفعلية؛ ArchiveAsset can create real OperationTask rows when DB is available، لكن الربط المباشر الكامل مع dedicated ContentItem model ما زال pending.
- Operations/Content workflow models have staged contracts only; runtime schema and repository cutover remain pending.
- Smart Archive: `ArchiveCollection` و`ArchiveProject` أصبح لهما DB-backed read/write API مع foundation fallback؛ `ArchiveDriveLink` create/read يعمل عبر AuditLog-backed records إلى أن يدخل runtime model؛ `ArchiveAsset` review actions تعمل عبر AuditLog-backed records، بينما asset metadata و`ArchiveVideoFrame` لديهم staged schema + repository read fallback فقط.
- Google Drive sync, Drive access testing, file download, and Archive AI analysis remain manual/foundation-first.
- Brand Center: `BrandProfile`, `BrandColor`, `BrandGuideline` DB-backed read/fallback؛ BrandColor and BrandGuideline manual creation are runtime Prisma-backed with AuditLog؛ BrandAsset, BrandFont, and BrandMessageFramework manual records are audit-backed and visible in Brand Center, while dedicated runtime `BrandAsset`, `BrandFont`, and generated `BrandMessageFramework` delegates are still pending.
- Shared AI Core جاهز للعقود والـ provider fallback؛ `AiOperationRun` لديه staged schema + optional persistence fallback، لكن runtime schema ما زال pending.
- Connections UI يعرض المنصات الجديدة كعقود جاهزية، لكن sync/testing الحقيقي لهذه المنصات يجب أن يبقى `NOT_IMPLEMENTED` حتى تنفيذ provider clients بشكل آمن.

## Known risks

- ArchiveDriveLink, ArchiveAsset review actions, Operations Content Items, manual BrandAsset records, manual BrandFont records, and manual BrandMessageFramework records are currently audit-backed, not dedicated runtime models; later cutover should add dedicated models and migrate/read historical audit metadata if needed.
- Google Drive metadata sync لا ينفذ external call في foundation mode؛ يحتاج provider-backed implementation لاحقًا.
- Archive AI analysis draft-only ولا يعتمد أي أصل بدون human review.
- ArchiveAsset preview/thumbnail policy needs a dedicated safety pass before runtime writes.
- BrandAsset manual URL records must be verified before being treated as official production downloads.
- BrandColor manual rows should be reviewed against official brand files before being treated as final design authority.
- BrandGuideline manual rows should be reviewed before AI or team workflows treat them as final voice authority.
- BrandFont manual rows should be reviewed before designers treat them as final typography authority.
- BrandMessageFramework manual rows should be reviewed before AI or team workflows use them for campaign messages.
- Content item `PUBLISHED` status is currently a manual workflow marker only; full ContentPublication runtime rows are still pending.
- AI audit persistence يحتاج runtime schema قبل DB writes فعلية، ويجب أن يظل sanitized ودون أسرار.
- ArchiveCollection وArchiveProject write paths تعتمد على DB availability وunique slugs؛ الفشل يظهر بوضوح بدل الحفظ الوهمي.
- OperationTask quick edit يعمل فقط على rows فعلية؛ foundation generated tasks تبقى read-only.
- Some Operations content items are audit-backed and should be migrated to `ContentItem` rows after the runtime model is appended.
- بعض staff users قد يحتاجون تحديث dashboardPermissions لإضافة `operations`, `archive`, أو `brand` بعد إدخال المفاتيح الجديدة.
- Operations content workflow runtime cutover should be split into small PRs to avoid schema/client blast radius.
- PRs القديمة #30, #37, #40, #43, #52, #54 لا يجب دمجها كما هي الآن؛ راجع `docs/dashboard-open-pr-audit.md`.

## Next recommended package

`Append ArchiveDriveLink runtime model`

الهدف: إدخال `ArchiveDriveLink` فقط إلى `prisma/schema.prisma` ثم تشغيل Prisma/Vercel build. لا Google Drive sync، لا ArchiveAsset، لا AI، لا تنزيل ملفات.

بعد نجاح ذلك:

- `Cut over ArchiveDriveLink create/read to runtime delegate` مع إبقاء AuditLog historical overlay.
- `Append ContentItem and BrandAsset runtime models` بعد تأكيد أن cutover صغير وآمن.
- `Append ArchiveAsset runtime model` بعد تثبيت سياسة preview/sensitivity.
- `Append BrandFont and MessageFramework runtime models` ثم cut over Typography/Frameworks read paths تدريجيًا.
- `Append Operations content workflow runtime models` كشرائح صغيرة.
- `Append AiOperationRun runtime model` بعد تثبيت sanitization/retention policy.
- تنفيذ Google Drive metadata sync لاحقًا فقط بعد readiness كاملة في provider catalog وMarketingPlatformConnection.

---

## 2026-07-04 — Phase 0 audit + Locale Foundation

- Added `docs/dashboard-operating-system-audit.md` — full Phase 0 audit of the
  dashboard operating system (schema truth, the two messaging systems, locale
  duplication, nav, prior-plan reconciliation). No runtime change.
- Added `docs/dashboard-operating-system.md` — target architecture + current→target
  route map + package roadmap (north star; supersedes nothing, references prior docs).
- Shipped **Locale Foundation** package (`docs/implementation-packages/locale-foundation.md`):
  `lib/locales.ts` is now the single source of truth with `direction`, `nativeLabel`,
  `fallbackLocale`, `enabled` metadata; `sq/it/nl/sv` registered `enabled:false`
  (not publicly routed). Core routers (middleware, i18n routing, `[locale]/layout`
  VALID_LOCALES) and direction helpers (SyncHtmlDir, DashboardLayoutClient) now derive
  from the catalog. **Zero public behaviour change** — the enabled set is the exact
  current 8 locales. No schema/payment/tracking/Twilio/SendGrid changes.
- Reconciled duplication in-package: `lib/seo.ts` + `lib/campaign/share-labels.ts` now
  derive their locale lists from the catalog (type-enforced drift guard), and the
  `de`-missing 7-locale arrays in `cart/payment`, `donations`, `stripe/intent`, and
  `verify-email` now use `isValidLocale` — latent bug fixed (German donors were losing
  `donation.locale`; payment processing untouched).
- Added `scripts/audit-locales.mjs` (`npm run locale:audit` / `:strict`) — runtime drift
  guard for content-keyed / non-importable sources (static message map, marketing
  locales, JSON-LD, `.mjs` audit, message-file existence). Currently passing.
- Still hand-maintained (flagged by the guard/type system): static message import map,
  date-fns maps, `subjects.ts` label chains, `country-to-locale` country sets.

---

## 2026-07-04 — Marketing Decision Surface (real data)

- Audited the marketing subsystem (`docs/implementation-packages/marketing-decision-surface.md`).
  Conversion/tracking truth layer is REAL (ConversionEvent ledger, Meta CAPI + GA4, status-based
  retry) — left untouched as sensitive. Campaign-link registry + overview reconciliation are REAL.
- **Insights page is now the real Marketing Overview**: surfaces platform revenue, the site-vs-platform
  revenue gap (difference), and true ROAS (site) vs platform ROAS + a revenue-match %, plus a
  gap-based recommendation. Pure additive UI over the existing `/marketing-intelligence/overview` API.
- **Fixed campaign-link `locale`**: the Link Generator sent `locale` but the registry service/route
  dropped it. Now threaded end-to-end and stored when it's a known catalog locale (`"auto"` → null).
- Honest gap (next package): Results + Recommendations pages still render the hardcoded fixture
  `lib/marketing/results/results-data.ts`; a real-data rebuild is a feature (ripples into
  `command-center-service` + recommendation rules) and was scoped out to avoid a risky refactor.
- Safety: no payment/tracking-sender/Twilio/SendGrid/schema changes. Build green (`next build` exit 0).

---

## 2026-07-04 — Communication domain foundation (audiences + sender routing)

- Added pure/read-only Communication Center domain services (mission Package 3; no send,
  no schema, no provider calls): `lib/communication/audience-service.ts` (dynamic language×
  channel audiences from the real donor base with lawful-safe eligibility — WhatsApp is
  always NEEDS_REVIEW, never silently bulk-eligible), `lib/communication/sender-router.ts`
  (pure locale/country/purpose/priority/fallback routing → sender or SKIPPED reason), and
  `lib/communication/language-coverage.ts` (per-locale EXISTS/FALLBACK/MISSING coverage +
  block-before-wrong-language decision).
- Added read-only Audiences page `/dashboard/operations/communication/audiences` (real
  counts, summary, per-language table, empty/error states), linked from the Communication overview.
- All catalog-driven (`lib/locales.ts`); no language hardcoded per channel. Reuses existing
  User fields + communication types. Build green (`next build` exit 0), new files add 0 type errors.
- Next: persist `CommunicationSender`/`SenderRoutingRule` (router already accepts them),
  Senders + Routing pages, then Meta WhatsApp adapter + delivery archive + approval send flow.

---

## 2026-07-04 — Navigation aligned + Communication Center surfaced

- Refactored `lib/dashboard/nav-config.ts` into architecture-aligned groups (عام / التسويق
  والنمو / المحتوى والتشغيل / الأرشيف الذكي / المستخدمون والرسائل / الهوية / الإعدادات) and
  **surfaced the Communication Center** ("مركز التواصل" → /dashboard/operations/communication),
  which was previously unreachable from the sidebar. Every key is an existing permission and
  every href an existing route — no permission keys added, no routes removed.
- Deduped `DASHBOARD_PERMISSION_ROWS` by key so the permissions-management table shows each
  permission once (revenue/ads/referrals/campaigns were already duplicated before).
- Access control unchanged: route→permission resolution is driven by `PATH_RULES` in
  permissions.ts, not the nav list. Build green (`next build` exit 0).
- Added canonical `docs/architecture/communication-center.md` (mission-named deliverable).

---

## 2026-07-05 — Marketing Results & Recommendations on real data (no fixtures left)

- Rebuilt `lib/marketing/results/results-service.ts` (now async, DB-backed): per-campaign
  spend/clicks from `AdCampaignSnapshot` joined with first-party site donations/revenue from
  donation attribution via `aggregateBreakdown(..., "campaign")` (+ shared `fetchAdsDonations`).
  ROAS = site revenue ÷ spend; status/decision/learning rule-derived, no fabricated specifics.
- **Deleted the fake fixture** `lib/marketing/results/results-data.ts`. Propagated async through
  recommendation-service, command-center-service, executive system-overview, and the results/
  recommendations pages (now `force-dynamic`, with empty states). Removed forbidden UI text
  ("AI Foundation", "…AI Core later", "Results Loop").
- Reused existing attribution engine (no duplication). No payment/tracking-sender/schema changes.
  Build green (`next build` exit 0), 0 new type errors. Marketing now shows only real data.
