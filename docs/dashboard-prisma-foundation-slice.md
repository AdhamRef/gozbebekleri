# Dashboard Prisma Foundation Slice

آخر تحديث: 2026-06-21

## الهدف

هذا الملف يوثق أول شريحة صغيرة وآمنة من موديلات الداشبورد التي تم تجهيزها أولًا كـ reviewable schema artifact ثم إدخالها تدريجيًا في `prisma/schema.prisma` الأساسي مع cutover محدود لكل repository.

الشريحة المرجعية باقية في:

`prisma/dashboard-foundation.schema.prisma`

والموديلات الستة نفسها موجودة الآن أيضًا في:

`prisma/schema.prisma`

## الحالة الحالية

تم تنفيذ المسار الآمن حتى الآن:

- تم تجهيز الشريحة المستقلة والتحقق منها عبر `npm run dashboard:schema:validate`.
- تم إدخال الموديلات الستة في `prisma/schema.prisma` الأساسي.
- تم قطع `BrandProfile`, `BrandColor`, `BrandGuideline` إلى قراءة DB-backed مع fallback foundation.
- تم قطع `ArchiveCollection` و`ArchiveProject` إلى قراءة DB-backed مع fallback foundation.
- تم قطع `OperationTask` إلى قراءة DB-backed مع fallback محسوب من Planning Engine.
- تم إضافة create/update API آمن لـ `OperationTask` مع zod validation وAuditLog.
- تم فتح UI transition controls للمهام الفعلية في `/dashboard/operations/tasks` باستخدام PATCH الحالي.

لم يتم في هذه المرحلة:

- تحويل أفعال الأرشيف إلى DB writes.
- تشغيل Google Drive sync حقيقي.
- نقل `ArchiveAsset` أو `ArchiveDriveLink` إلى DB-backed runtime.
- إضافة إنشاء/تحرير كامل للمهام من الواجهة.
- تشغيل أي إرسال أو نشر تلقائي.
- تغيير payment أو tracking runtime.

## التحقق

تمت إضافة أمر واضح للتحقق من الشريحة المستقلة بدون لمس `prisma/schema.prisma` الأساسي:

```bash
npm run dashboard:schema:validate
```

الأمر يشغل:

```bash
prisma validate --schema prisma/dashboard-foundation.schema.prisma
```

بعد كل cutover يجب أن يمر Vercel Preview ثم Production بعد الدمج.

## لماذا القطع تدريجي؟

لأن النظام الحالي يعمل على foundation repositories وواجهات مستقرة. إدخال كل موديلات Operations/Archive/Brand دفعة واحدة يزيد خطر كسر build أو توليد Prisma Client غير مستخدم بعد.

المسار الآمن:

1. Stage schema slice.
2. Validate staged slice with `npm run dashboard:schema:validate`.
3. Append slice to primary `prisma/schema.prisma`.
4. تشغيل `npx prisma generate` و`npm run build` عبر Vercel.
5. نقل repository واحد فقط إلى DB-backed mode.
6. إبقاء fallback foundation عند غياب `DATABASE_URL` أو فشل القراءة.
7. إبقاء الأفعال الحساسة manual-first حتى يكتمل auth/audit/validation.

## الموديلات في الشريحة الأولى

- `BrandProfile`
- `BrandColor`
- `BrandGuideline`
- `ArchiveCollection`
- `ArchiveProject`
- `OperationTask`

## cutover status

| Model | Runtime status | Notes |
| --- | --- | --- |
| `BrandProfile` | DB-backed read + foundation fallback | Brand overview and brand tabs can read active profile data. |
| `BrandColor` | DB-backed read + foundation fallback | Colors tab and overview can read DB colors. |
| `BrandGuideline` | DB-backed read + foundation fallback | Voice/copy rules can read DB guidelines. |
| `ArchiveCollection` | DB-backed read + foundation fallback | Smart Archive pages read collections through archive repository. |
| `ArchiveProject` | DB-backed read + foundation fallback | Smart Archive pages read projects through archive repository. |
| `OperationTask` | DB-backed read/write API + UI transitions + computed foundation fallback | Tasks page/API can read Prisma tasks, update daily statuses, and fail safely when DB rows are not available. |

## ما لا يوجد في هذه الشريحة

- لا يوجد `BrandAsset` بعد، حتى لا نخلطه مع `ArchiveAsset` قبل تجهيز upload/download policy.
- لا يوجد `ArchiveAsset` بعد، لأن Drive metadata sync يحتاج provider credentials/scopes جاهزة.
- لا يوجد `ContentItem` بعد، لأن Blog/Templates/Operations links تحتاج cutover تدريجي.
- لا يوجد `AiOperationRun` بعد، لأن audit persistence يحتاج سياسة retention وعدم حفظ أسرار.

## قواعد الأمان

- لا تغييرات دفع.
- لا تغييرات tracking runtime.
- لا external platform calls.
- لا إرسال أو نشر تلقائي.
- لا AI approval تلقائي.
- BrandAsset يبقى منفصل عن ArchiveAsset.
- Archive Drive links/assets/video frames/AI remain foundation/manual-first.
- OperationTask writes require operations permission, zod validation, DB availability, and AuditLog.
- OperationTask transition buttons are disabled for generated foundation tasks.

## cutover المقترح التالي

العنوان المقترح:

`Add operation task creation and edit forms`

العمل:

- إضافة نموذج إنشاء مهمة تشغيل.
- إضافة تعديل محدود للعنوان، المسؤول، الأولوية، الموعد، والملاحظات.
- ربط المهام تدريجيًا بعناصر المحتوى والأرشيف عند توفر IDs حقيقية.
- إبقاء Scheduler وDonor Reactivation manual-first.
- عدم إضافة إرسال تلقائي.

## ملاحظات Mongo/Prisma

- العلاقات في هذه الشريحة محفوظة كـ ObjectId scalar fields بدون relation blocks لتقليل التعقيد.
- الفهارس مضافة فقط للقراءة المعتادة والفلاتر الرئيسية.
- لا توجد unique constraints إلا على `BrandProfile.key` و`ArchiveCollection.slug` لأنها معرفات طبيعية مستقرة.