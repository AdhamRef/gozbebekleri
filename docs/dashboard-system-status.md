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

## ما تم تجهيزه في الحزمة الحالية

- Provider catalog أصبح يحتوي عقود `google_drive`, `google_picker`, `video_frame_extractor`, و`storage_provider`.
- OpenAI provider contract أصبح مرتبطًا صراحةً بـ Shared AI Core وhuman approval.
- تم توسيع provider types لـ Archive/Storage capabilities بدون بناء Google Drive sync أو AI client جديد.

## المسارات الرئيسية

- `/dashboard/system-overview`
- `/dashboard/marketing`
- `/dashboard/marketing/campaign-operating-center`
- `/dashboard/marketing/campaign-links`
- `/dashboard/marketing/campaign-links/[id]`
- `/dashboard/marketing/ai-assistant`
- `/dashboard/marketing/tracking-hub`
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

- Operations datasets ما زالت foundation/repository-backed وليست DB-backed بالكامل، لكن عقود الموديلات أصبحت موثقة ومقروءة من النظام.
- Smart Archive يستخدم foundation repository data؛ الموديلات الجاهزة للتحويل القادم: `ArchiveCollection`, `ArchiveProject`, `ArchiveDriveLink`, `ArchiveAsset`, `ArchiveVideoFrame`.
- Brand Center يستخدم foundation repository data؛ الموديلات الجاهزة للتحويل القادم: `BrandProfile`, `BrandAsset`, `BrandColor`, `BrandFont`, `BrandGuideline`, `BrandMessageFramework`.
- Shared AI Core جاهز للعقود والـ audit/fallback؛ الموديل المقترح للخطوة التالية: `AiOperationRun`.
- Provider catalog أصبح يحتوي العقود الناقصة، لكن Connections UI يحتاج لاحقًا adapter أوسع لعرض Archive/Storage/AI provider readiness بشكل كامل.

## Known risks

- Prisma schema لم يتم تغييره في حزمة DB contracts؛ هذا مقصود لتجنب migration كبيرة قبل تثبيت العقود.
- Google Drive metadata sync لا ينفذ external call في foundation mode؛ يحتاج provider-backed implementation لاحقًا.
- Archive AI analysis draft-only ولا يعتمد أي أصل بدون human review.
- بعض staff users قد يحتاجون تحديث dashboardPermissions لإضافة `operations`, `archive`, أو `brand` بعد إدخال المفاتيح الجديدة.
- Brand assets الرسمية ما زالت تحتاج رفع ملفات logo/certificate/template حقيقية قبل تفعيل downloads.
- PR #52 قديم وغير mergeable، ويبدو مكررًا/متجاوزًا جزئيًا بعد executive overview الأحدث.
- PR #54 أصبح مرشحًا للإغلاق أو التفكيك بعد هذه الحزمة، لأنه لم يعد المصدر الوحيد لعقود Archive/AI providers.

## Next recommended package

`Connections UI Adapter and Readiness Alignment`

الهدف: جعل `/dashboard/marketing/connections` يعرض AI وArchive/Storage provider readiness من provider catalog بوضوح، مع masking للأسرار وبدون تنفيذ أي sync خارجي.

بعدها تأتي:

`Prisma Model Migration and Repository Cutover`

الشريحة الأولى المقترحة:

- `BrandProfile`
- `BrandColor`
- `BrandGuideline`
- `ArchiveCollection`
- `ArchiveProject`
- `OperationTask`