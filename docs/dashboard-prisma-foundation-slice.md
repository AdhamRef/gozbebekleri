# Dashboard Prisma Foundation Slice

آخر تحديث: 2026-06-21

## الهدف

هذا الملف يوثق أول شريحة صغيرة وآمنة من موديلات الداشبورد التي تم تجهيزها أولًا كـ reviewable schema artifact ثم إدخالها في `prisma/schema.prisma` الأساسي بدون تغيير runtime behavior.

الشريحة المرجعية باقية في:

`prisma/dashboard-foundation.schema.prisma`

والموديلات الستة نفسها موجودة الآن أيضًا في:

`prisma/schema.prisma`

## الحالة الحالية

تم تنفيذ مرحلة `Append first dashboard Prisma models` بإضافة الموديلات الستة الأولى إلى الـ schema الرئيسي فقط.

لم يتم في هذه المرحلة:

- نقل أي Repository من foundation إلى DB-backed.
- تغيير أي صفحة Dashboard لتكتب في قاعدة البيانات الجديدة.
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

بعد إدخال الموديلات في `prisma/schema.prisma` يجب أن يمر `prisma generate` و`next build` عبر Vercel Preview قبل الدمج.

## لماذا لم يتم قطع كل repositories مباشرة؟

لأن النظام الحالي يعمل على foundation repositories وواجهات مستقرة. إدخال كل موديلات Operations/Archive/Brand دفعة واحدة يزيد خطر كسر build أو توليد Prisma Client غير مستخدم بعد.

المسار الآمن:

1. Stage schema slice.
2. Validate staged slice with `npm run dashboard:schema:validate`.
3. Append slice to primary `prisma/schema.prisma` في PR مستقل.
4. تشغيل `npx prisma generate` و`npm run build`.
5. نقل repository واحد فقط إلى DB-backed mode.
6. إبقاء fallback foundation عند غياب `DATABASE_URL` أو فشل القراءة.

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

`Cut over brand profiles to repository backed storage`

العمل:

- نقل `BrandProfile` و`BrandColor` و`BrandGuideline` إلى repository DB-backed مع fallback foundation.
- إبقاء `BrandAsset` foundation حتى توفر الملفات الرسمية.
- عدم نقل Archive/Operations في نفس PR.

### PR بعده

العنوان المقترح:

`Cut over archive collections to repository backed storage`

العمل:

- نقل `ArchiveCollection` و`ArchiveProject` إلى DB-backed read/write foundation-safe repositories.
- إبقاء `ArchiveAsset` وDrive sync في foundation/provider-ready mode.

## ملاحظات Mongo/Prisma

- العلاقات في هذه الشريحة محفوظة كـ ObjectId scalar fields بدون relation blocks لتقليل التعقيد.
- الفهارس مضافة فقط للقراءة المعتادة والفلاتر الرئيسية.
- لا توجد unique constraints إلا على `BrandProfile.key` و`ArchiveCollection.slug` لأنها معرفات طبيعية مستقرة.
