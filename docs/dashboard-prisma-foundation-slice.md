# Dashboard Prisma Foundation Slice

آخر تحديث: 2026-06-22

## الهدف

هذا الملف يوثق شريحة DB foundation آمنة للداشبورد. الشريحة المرجعية موجودة في:

`prisma/dashboard-foundation.schema.prisma`

الموديلات الستة الأولى موجودة أيضًا في `prisma/schema.prisma`، أما بقية موديلات Brand/Archive/Operations/AI في هذه الشريحة فهي staged contracts فقط حتى يتم إدخالها تدريجيًا في runtime schema.

## الحالة الحالية

تم تنفيذ المسار الآمن حتى الآن:

- تم تجهيز الشريحة المستقلة والتحقق منها عبر `npm run dashboard:schema:validate`.
- تم إدخال الموديلات الستة الأولى في `prisma/schema.prisma` الأساسي.
- تم قطع `BrandProfile`, `BrandColor`, `BrandGuideline` إلى قراءة DB-backed مع fallback foundation.
- تم قطع `ArchiveCollection` و`ArchiveProject` إلى قراءة DB-backed مع fallback foundation.
- تم قطع `OperationTask` إلى قراءة DB-backed مع fallback محسوب من Planning Engine.
- تم إضافة create/update API آمن لـ `OperationTask` مع zod validation وAuditLog.
- تم تجهيز `BrandAsset`, `BrandFont`, و`BrandMessageFramework` كعقود staged فقط.
- تم تجهيز Brand repository ليقرأ `BrandAsset`, `BrandFont`, و`BrandMessageFramework` إذا كان Prisma Client يوفّر delegates، وإلا يرجع foundation data بوضوح.
- تم تجهيز `ArchiveDriveLink`, `ArchiveAsset`, و`ArchiveVideoFrame` كعقود staged فقط لدعم Google Drive metadata وAI/human review لاحقًا.
- تم تجهيز عقود Operations/Content التالية كـ staged contracts فقط: `OperationSeason`, `MonthlyContentPlan`, `ContentItem`, `ContentPublication`, `MessageSchedule`, `DonorReactivationReminder`, `MarketingLearning`, و`ContentAdLink`.
- تم تجهيز `AiOperationRun` كعقد staged فقط لسجل تشغيل Shared AI Core.

لم يتم في هذه المرحلة:

- إدخال موديلات Brand/Archive/Operations/Content/AI الجديدة إلى `prisma/schema.prisma` الرئيسي.
- تشغيل Google Drive sync حقيقي.
- تحميل ملفات Drive أو تحليل صور/فيديوهات تلقائيًا.
- تحويل أفعال Archive approval/create-content/assign-task إلى DB writes.
- إضافة repository DB-backed write path للـ AI audit log.
- إرسال أو نشر تلقائي.
- إنشاء ContentAdPerformance يكرر AdSnapshot.
- تغيير payment أو tracking runtime.

## التحقق

الأمر المرجعي للتحقق من الشريحة المستقلة:

```bash
npm run dashboard:schema:validate
```

الأمر يشغل:

```bash
prisma validate --schema prisma/dashboard-foundation.schema.prisma
```

بعد كل cutover يجب أن يمر Vercel Preview ثم Production بعد الدمج.

## الموديلات في الشريحة

### Brand

- `BrandProfile`
- `BrandAsset` staged contract + repository read fallback only
- `BrandColor`
- `BrandFont` staged contract + repository read fallback only
- `BrandGuideline`
- `BrandMessageFramework` staged contract + repository read fallback only

### Archive

- `ArchiveCollection`
- `ArchiveProject`
- `ArchiveDriveLink` staged contract only
- `ArchiveAsset` staged contract only
- `ArchiveVideoFrame` staged contract only

### Operations & Content

- `OperationTask`
- `OperationSeason` staged contract only
- `MonthlyContentPlan` staged contract only
- `ContentItem` staged contract only
- `ContentPublication` staged contract only
- `MessageSchedule` staged contract only
- `DonorReactivationReminder` staged contract only
- `MarketingLearning` staged contract only
- `ContentAdLink` staged contract only

### Shared AI

- `AiOperationRun` staged contract only

## cutover status

| Model | Runtime status | Notes |
| --- | --- | --- |
| `BrandProfile` | DB-backed read + foundation fallback | Brand overview and brand tabs can read active profile data. |
| `BrandAsset` | Repository read fallback prepared; runtime schema pending | Brand Center assets come from the Brand repository snapshot when available. |
| `BrandColor` | DB-backed read + foundation fallback | Colors tab and overview can read DB colors. |
| `BrandFont` | Repository read fallback prepared; runtime schema pending | Typography can use the same Brand repository snapshot once runtime model exists. |
| `BrandGuideline` | DB-backed read + foundation fallback | Voice/copy rules can read DB guidelines. |
| `BrandMessageFramework` | Repository read fallback prepared; runtime schema pending | Message frameworks can use the same Brand repository snapshot once runtime model exists. |
| `ArchiveCollection` | DB-backed read + foundation fallback | Smart Archive pages read collections through archive repository. |
| `ArchiveProject` | DB-backed read + foundation fallback | Smart Archive pages read projects through archive repository. |
| `ArchiveDriveLink` | Staged contract only | Google Drive link metadata; no external Drive calls yet. |
| `ArchiveAsset` | Staged contract only | Drive file metadata, AI draft fields, human review fields, marketing/documentation approval flags. |
| `ArchiveVideoFrame` | Staged contract only | Frame metadata for later video analysis; no frame extraction or AI call yet. |
| `OperationTask` | DB-backed read/write API + create/edit UI + transitions + computed foundation fallback | Tasks page/API supports safe manual operations for real rows. |
| `OperationSeason` | Staged contract only | AI-suggested dates stay suggested until human review. |
| `MonthlyContentPlan` | Staged contract only | Plans can later generate ContentItems and OperationTasks. |
| `ContentItem` | Staged contract only | Does not replace Blog/Post models; links to them when needed. |
| `ContentPublication` | Staged contract only | Manual publishing checklist, not auto-publish. |
| `MessageSchedule` | Staged contract only | Manual-first scheduling; no automatic send. |
| `DonorReactivationReminder` | Staged contract only | Candidate reminders only; no automatic outreach. |
| `MarketingLearning` | Staged contract only | Stores learnings without duplicating ad snapshots. |
| `ContentAdLink` | Staged contract only | Links content/ad/platform identifiers only; no performance table duplicate. |
| `AiOperationRun` | Staged contract only | Sanitized Shared AI Core audit entries. |

## قواعد الأمان

- لا تغييرات دفع.
- لا تغييرات tracking runtime.
- لا external platform calls.
- لا Google Drive sync في هذه الحزمة.
- لا frame extraction أو AI analysis في هذه الحزمة.
- لا إرسال أو نشر تلقائي.
- لا AI approval تلقائي.
- BrandAsset يبقى منفصل عن ArchiveAsset.
- ArchiveAsset يبقى للصور/الفيديو/التقارير الميدانية، وليس للوجوهات والهوية.
- sensitive/needsBlur/humanReviewRequired fields موجودة كعقود فقط ولا تمنح اعتمادًا تلقائيًا.
- ContentAdLink لا يكرر AdSnapshot أو MarketingCampaignSnapshot.
- Donor Reactivation وScheduler manual-first فقط.

## cutover المقترح التالي

الأولوية ما زالت:

`Append BrandAsset runtime model`

بعدها يمكن تنفيذ:

- `Append ArchiveDriveLink runtime model` كخطوة صغيرة قبل ArchiveAsset.
- `Append ArchiveAsset runtime model` بعد readiness لسياسة preview/thumbnail وحماية المواد الحساسة.
- `Append BrandFont and MessageFramework runtime models`.
- `Append Operations content workflow runtime models` على شرائح صغيرة.
- `Append AiOperationRun runtime model` بعد تثبيت sanitization/retention policy.

## ملاحظات Mongo/Prisma

- العلاقات محفوظة كـ ObjectId scalar fields بدون relation blocks لتقليل التعقيد.
- الفهارس مضافة للقراءة والفلاتر الرئيسية فقط.
- `BrandAsset`, `BrandFont`, و`BrandMessageFramework` تبدأ كـ `TO_VERIFY`.
- `ArchiveAsset.aiStatus` يبدأ بـ `NOT_ANALYZED` و`humanReviewStatus` يبدأ بـ `PENDING`.
- `ArchiveVideoFrame.humanReviewRequired` يبدأ بـ `true`.
- `AiOperationRun.status` يبدأ بـ `DRAFT` و`humanApprovalRequired` يبدأ بـ `true`.
- `ContentPublication`, `MessageSchedule`, و`DonorReactivationReminder` لا تعني أي إرسال/نشر تلقائي.
