# Dashboard System Status

آخر تحديث: 2026-06-21

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
- `BrandAsset` staged contract added to `prisma/dashboard-foundation.schema.prisma` only.
- Brand Center assets are sourced through the Brand repository snapshot, with optional Prisma `brandAsset` read fallback when the generated delegate exists.

## ما يتم تجهيزه في الحزمة الحالية

- `AiOperationRun` is now staged in `prisma/dashboard-foundation.schema.prisma` as the DB contract for Shared AI Core audit persistence.
- The staged model tracks action, context, requested tool, sanitized prompt preview, sanitized input/output, status, risk level, human approval flags, user, timestamps, and error.
- This package does not add `AiOperationRun` to `prisma/schema.prisma` yet.
- This package does not add AI DB write behavior yet.
- AI outputs remain draft-only and require human approval.
- No automatic sending, publishing, Google Drive sync, external AI call, payment change, tracking runtime change, or frontend secret exposure.

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
- Operations Tasks: `OperationTask` DB-backed read/write API وUI create/edit/transitions موجودة للمهام الفعلية؛ الربط المباشر مع ContentItem/ArchiveAsset ما زال pending حتى تدخل هذه الموديلات للـ DB-backed runtime.
- Smart Archive: `ArchiveCollection` و`ArchiveProject` DB-backed read/fallback؛ أما `ArchiveDriveLink`, `ArchiveAsset`, `ArchiveVideoFrame`, Google Drive sync, and AI analysis فباقية foundation/manual-first.
- Brand Center: `BrandProfile`, `BrandColor`, `BrandGuideline` DB-backed read/fallback؛ `BrandAsset` لديه staged schema + repository read fallback، لكن runtime schema الأساسي ما زال pending. `BrandFont` و`BrandMessageFramework` ما زالت foundation.
- Shared AI Core جاهز للعقود والـ provider fallback؛ `AiOperationRun` لديه staged schema contract فقط، والـ runtime schema/repository persistence ما زال pending.
- Connections UI يعرض المنصات الجديدة كعقود جاهزية، لكن sync/testing الحقيقي لهذه المنصات يجب أن يبقى `NOT_IMPLEMENTED` حتى تنفيذ provider clients بشكل آمن.

## Known risks

- Google Drive metadata sync لا ينفذ external call في foundation mode؛ يحتاج provider-backed implementation لاحقًا.
- Archive AI analysis draft-only ولا يعتمد أي أصل بدون human review.
- AI audit persistence يحتاج sanitization/retention policy قبل runtime write path حتى لا يحفظ أسرار أو بيانات حساسة.
- DB-backed read modes تحتاج rows فعلية؛ إذا كانت collections فارغة سيظهر foundation fallback بشكل مقصود.
- OperationTask quick edit يعمل فقط على rows فعلية؛ foundation generated tasks تبقى read-only.
- بعض staff users قد يحتاجون تحديث dashboardPermissions لإضافة `operations`, `archive`, أو `brand` بعد إدخال المفاتيح الجديدة.
- Brand assets الرسمية ما زالت تحتاج سياسة URL/download واضحة ورفع ملفات logo/certificate/template حقيقية قبل تفعيل downloads.
- PRs القديمة #30, #37, #40, #43, #52, #54 لا يجب دمجها كما هي الآن؛ راجع `docs/dashboard-open-pr-audit.md`.

## Next recommended package

`Append BrandAsset runtime model`

الهدف: إدخال `BrandAsset` فقط إلى `prisma/schema.prisma` الرئيسي، ثم السماح للـ repository read fallback الحالي بقراءة manual URL records عند توفرها، بدون upload policy واسع.

بعدها:

- `Append AiOperationRun runtime model` بعد تثبيت sanitization/retention policy.
- ربط OperationTask تدريجيًا بـ ContentItem وArchiveAsset عند توفر الموديلات الفعلية.
- تنفيذ Google Drive metadata sync لاحقًا فقط بعد readiness كاملة في provider catalog وMarketingPlatformConnection.