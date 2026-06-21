# Dashboard Prisma Foundation Slice

آخر تحديث: 2026-06-21

## الهدف

هذا الملف يوثق أول شريحة صغيرة وآمنة من موديلات الداشبورد الجاهزة للإدخال في `prisma/schema.prisma` الأساسي لاحقًا.

الشريحة موجودة في:

`prisma/dashboard-foundation.schema.prisma`

وهي مقصودة كـ reviewable schema artifact قبل تشغيل cutover فعلي.

## لماذا لم يتم قطع كل repositories مباشرة؟

لأن النظام الحالي يعمل على foundation repositories وواجهات مستقرة. إدخال كل موديلات Operations/Archive/Brand دفعة واحدة يزيد خطر كسر build أو توليد Prisma Client غير مستخدم بعد.

المسار الآمن:

1. Stage schema slice.
2. Append slice to primary `prisma/schema.prisma` في PR مستقل.
3. تشغيل `npx prisma generate` و`npm run build`.
4. نقل repository واحد فقط إلى DB-backed mode.
5. إبقاء fallback foundation عند غياب `DATABASE_URL` أو فشل القراءة.

## الموديلات في الشريحة الأولى

- `BrandProfile`
- `BrandColor`
- `BrandGuideline`
- `ArchiveCollection`
- `ArchiveProject`
- `OperationTask`

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

## cutover المقترح التالي

### PR التالي

العنوان المقترح:

`Append first dashboard Prisma models`

العمل:

- نسخ الموديلات الستة من `prisma/dashboard-foundation.schema.prisma` إلى `prisma/schema.prisma` الأساسي.
- تشغيل Prisma generate/build.
- عدم تغيير أي runtime service.

### PR بعده

العنوان المقترح:

`Cut over brand profiles to repository backed storage`

العمل:

- نقل `BrandProfile` و`BrandColor` و`BrandGuideline` إلى repository DB-backed مع fallback foundation.
- إبقاء `BrandAsset` foundation حتى توفر الملفات الرسمية.

## ملاحظات Mongo/Prisma

- العلاقات في هذه الشريحة محفوظة كـ ObjectId scalar fields بدون relation blocks لتقليل التعقيد.
- الفهارس مضافة فقط للقراءة المعتادة والفلاتر الرئيسية.
- لا توجد unique constraints إلا على `BrandProfile.key` و`ArchiveCollection.slug` لأنها معرفات طبيعية مستقرة.
