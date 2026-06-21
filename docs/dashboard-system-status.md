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

- Operations datasets ما زالت foundation/repository-backed وليست DB-backed بالكامل.
- Smart Archive يستخدم foundation repository data؛ الموديلات المقترحة للتحويل القادم: `ArchiveCollection`, `ArchiveProject`, `ArchiveDriveLink`, `ArchiveAsset`, `ArchiveVideoFrame`.
- Brand Center يستخدم model contracts وfoundation repository data؛ الموديلات المقترحة للتحويل القادم: `BrandProfile`, `BrandAsset`, `BrandColor`, `BrandFont`, `BrandGuideline`, `BrandMessageFramework`.
- AI Core جاهز للعقود والـ audit/fallback، لكن tools التنفيذية ما زالت تحتاج تنفيذ read-only أو write-proposed لاحقًا.
- Provider catalog القديم #54 ما زال PR منفصلًا ويحتاج مراجعة قبل الدمج أو الإغلاق.

## Known risks

- Google Drive metadata sync لا ينفذ external call في foundation mode؛ يحتاج provider-backed implementation لاحقًا.
- Archive AI analysis draft-only ولا يعتمد أي أصل بدون human review.
- بعض staff users قد يحتاجون تحديث dashboardPermissions لإضافة `operations`, `archive`, أو `brand` بعد إدخال المفاتيح الجديدة.
- Brand assets الرسمية ما زالت تحتاج رفع ملفات logo/certificate/template حقيقية قبل تفعيل downloads.
- PR #52 قديم وغير mergeable، ويبدو مكررًا/متجاوزًا جزئيًا بعد executive overview الأحدث.
- PR #54 قديم ولم يدخل main؛ لا يغلق إلا بعد مراجعة provider catalog الحالي.

## Next recommended package

`Operations DB Contracts Small Migration`

الهدف: تحويل foundation contracts الأكثر استقرارًا إلى Prisma models صغيرة وآمنة بدون migration كبيرة أو تغيير في payment/tracking runtime.
