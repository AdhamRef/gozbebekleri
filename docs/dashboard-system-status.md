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

## ما يتم تجهيزه في الحزمة الحالية

- `/dashboard/operations/tasks` يعرض أزرار انتقال يومية للمهام الفعلية: Start, Ready for review, Complete, Block, Resume, Back to pending.
- الأزرار تستخدم PATCH الحالي على `/api/dashboard/operations/tasks` فقط، مع operations permission وzod validation وAuditLog.
- الأزرار تتعطل تلقائيًا في foundation fallback أو عند عدم وجود ObjectId حقيقي، حتى لا يحدث نجاح وهمي.
- يوجد feedback واضح عبر toast، ويتم تحديث القائمة بعد كل إجراء ناجح.
- لا يوجد إرسال تلقائي، ولا نشر تلقائي، ولا تغيير Scheduler أو Donor Reactivation.

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
- Operations Tasks: `OperationTask` DB-backed read/write API وUI transitions موجودة للمهام الفعلية؛ إنشاء/تحرير المهام من الواجهة ما زال pending.
- Smart Archive: `ArchiveCollection` و`ArchiveProject` DB-backed read/fallback؛ أما `ArchiveDriveLink`, `ArchiveAsset`, `ArchiveVideoFrame`, Google Drive sync, and AI analysis فباقية foundation/manual-first.
- Brand Center: `BrandProfile`, `BrandColor`, `BrandGuideline` DB-backed read/fallback؛ أما `BrandAsset`, `BrandFont`, `BrandMessageFramework` فباقية foundation.
- Shared AI Core جاهز للعقود والـ audit/fallback؛ الموديل المقترح للخطوة التالية: `AiOperationRun`.
- Connections UI يعرض المنصات الجديدة كعقود جاهزية، لكن sync/testing الحقيقي لهذه المنصات يجب أن يبقى `NOT_IMPLEMENTED` حتى تنفيذ provider clients بشكل آمن.

## Known risks

- Google Drive metadata sync لا ينفذ external call في foundation mode؛ يحتاج provider-backed implementation لاحقًا.
- Archive AI analysis draft-only ولا يعتمد أي أصل بدون human review.
- DB-backed read modes تحتاج rows فعلية؛ إذا كانت collections فارغة سيظهر foundation fallback بشكل مقصود.
- OperationTask UI transitions تعمل فقط على rows فعلية؛ foundation generated tasks تبقى read-only.
- بعض staff users قد يحتاجون تحديث dashboardPermissions لإضافة `operations`, `archive`, أو `brand` بعد إدخال المفاتيح الجديدة.
- Brand assets الرسمية ما زالت تحتاج رفع ملفات logo/certificate/template حقيقية قبل تفعيل downloads.
- PRs القديمة #30, #37, #40, #43, #52, #54 لا يجب دمجها كما هي الآن؛ راجع `docs/dashboard-open-pr-audit.md`.

## Next recommended package

`Add operation task creation and edit forms`

الهدف: إضافة إنشاء/تحرير مهام OperationTask من الواجهة وربطها تدريجيًا بعناصر المحتوى والأرشيف، مع استمرار منع الإرسال والنشر التلقائي.

بعدها:

- Stage `BrandAsset` أو `ArchiveDriveLink` حسب أولوية الفريق.
- تجهيز `AiOperationRun` persistence مع سياسة retention وعدم حفظ أسرار.
- تنفيذ Google Drive metadata sync لاحقًا فقط بعد readiness كاملة في provider catalog وMarketingPlatformConnection.