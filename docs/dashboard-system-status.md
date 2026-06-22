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

## ما يتم تجهيزه في الحزمة الحالية

- Archive Collections API now writes new collections through the runtime `ArchiveCollection` Prisma model.
- Archive Projects API now writes new projects through the runtime `ArchiveProject` Prisma model.
- Collections and Projects GET routes read the DB-backed archive snapshot and still keep the foundation fallback when DB rows are unavailable.
- Create actions write AuditLog entries on success.
- Validation stays server-side and narrow; invalid input returns a clear error instead of creating partial rows.
- No Google Drive sync, file download, AI analysis, auto approval, publishing, or sending is introduced.
- No payment changes, tracking runtime changes, external platform calls, or frontend secrets.

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

- Operations Scheduler, Production, Content Items, and Content Workflow Tasks ما زالت foundation/repository-backed وليست DB-backed بالكامل.
- Operations Tasks: `OperationTask` DB-backed read/write API وUI create/edit/transitions موجودة للمهام الفعلية؛ ArchiveAsset can create real OperationTask rows when DB is available، لكن الربط المباشر مع ContentItem ما زال pending حتى يدخل هذا الموديل للـ DB-backed runtime.
- Operations/Content workflow models have staged contracts only; runtime schema and repository cutover remain pending.
- Smart Archive: `ArchiveCollection` و`ArchiveProject` أصبح لهما DB-backed read/write API مع foundation fallback؛ `ArchiveDriveLink`, `ArchiveAsset`, و`ArchiveVideoFrame` لديهم staged schema + repository read fallback، لكن Google Drive sync/AI analysis/actions ما زالت foundation/manual-first.
- Brand Center: `BrandProfile`, `BrandColor`, `BrandGuideline` DB-backed read/fallback؛ `BrandAsset`, `BrandFont`, و`BrandMessageFramework` لديهم staged schema + repository read fallback، لكن runtime schema الأساسي ما زال pending لهذه الموديلات.
- Shared AI Core جاهز للعقود والـ provider fallback؛ `AiOperationRun` لديه staged schema + optional persistence fallback، لكن runtime schema ما زال pending.
- Connections UI يعرض المنصات الجديدة كعقود جاهزية، لكن sync/testing الحقيقي لهذه المنصات يجب أن يبقى `NOT_IMPLEMENTED` حتى تنفيذ provider clients بشكل آمن.

## Known risks

- Google Drive metadata sync لا ينفذ external call في foundation mode؛ يحتاج provider-backed implementation لاحقًا.
- Archive AI analysis draft-only ولا يعتمد أي أصل بدون human review.
- ArchiveAsset preview/thumbnail policy needs a dedicated safety pass before runtime writes.
- AI audit persistence يحتاج runtime schema قبل DB writes فعلية، ويجب أن يظل sanitized ودون أسرار.
- ArchiveCollection وArchiveProject write paths تعتمد على DB availability وunique slugs؛ الفشل يظهر بوضوح بدل الحفظ الوهمي.
- OperationTask quick edit يعمل فقط على rows فعلية؛ foundation generated tasks تبقى read-only.
- بعض staff users قد يحتاجون تحديث dashboardPermissions لإضافة `operations`, `archive`, أو `brand` بعد إدخال المفاتيح الجديدة.
- Brand assets الرسمية ما زالت تحتاج سياسة URL/download واضحة ورفع ملفات logo/certificate/template حقيقية قبل تفعيل downloads.
- Brand typography and message frameworks still need verified real organization rules before production authoring automation.
- Archive action handlers still operate in foundation/manual mode except `assign-task`, which creates real OperationTask rows when DB is available, and collection/project create APIs, which now write runtime rows.
- Operations content workflow runtime cutover should be split into small PRs to avoid schema/client blast radius.
- PRs القديمة #30, #37, #40, #43, #52, #54 لا يجب دمجها كما هي الآن؛ راجع `docs/dashboard-open-pr-audit.md`.

## Next recommended package

`Persist Archive Drive Links`

الهدف: جعل Archive Drive Links تكتب metadata آمنًا في DB بدون أي sync خارجي تلقائي، تمهيدًا لمرحلة Google Drive metadata sync لاحقًا.

بعدها:

- `Append ArchiveAsset runtime model` بعد سياسة preview/sensitivity.
- `Persist ArchiveAsset review actions` بعد دخول ArchiveAsset للـ runtime schema.
- `Append BrandAsset runtime model` لقراءة manual URL records حقيقية.
- `Append BrandFont and MessageFramework runtime models` ثم cut over Typography/Frameworks read paths تدريجيًا.
- `Append Operations content workflow runtime models` كشرائح صغيرة.
- `Append AiOperationRun runtime model` بعد تثبيت sanitization/retention policy.
- تنفيذ Google Drive metadata sync لاحقًا فقط بعد readiness كاملة في provider catalog وMarketingPlatformConnection.
