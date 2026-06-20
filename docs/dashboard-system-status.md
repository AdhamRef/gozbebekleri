# Dashboard System Status

آخر تحديث: 2026-06-20

## ما تم

- Campaign Registry أصبح لديه تدفق حفظ من Link Generator، وإدارة روابط بالحالات `ACTIVE`, `ARCHIVED`, `DELETED`.
- Campaign Link Detail يعرض بيانات الرابط، مؤشرات الأداء، Missing Identifiers، Recommended Actions، وTracking Truth للمنصات بدون إرسال تحويلات جديدة.
- Operations أصبح لديه foundation repository/service layer يغطي Scheduler, Production, Archive, Content Items, Tasks مع metadata واضحة للتحويل لاحقًا إلى قاعدة البيانات.
- AI Core أصبح مشتركًا بين سياقات `marketing`, `content`, `archive`, `brand` مع tool contracts، provider fallback آمن، audit log foundation، وقواعد human approval.
- تم فحص روابط `lib/dashboard/nav-config.ts`: كل روابط القائمة الحالية لها صفحات موجودة.
- تم تشديد صلاحيات dashboard: Brand routes تتبع صلاحية `slides`، وMarketing Tracking Hub يتبع `pixels` بدل `ads`.
- تم تشديد Operations dashboard APIs بإضافة session permission check و`Cache-Control: no-store`.
- لا توجد أسرار خام ظاهرة في صفحات dashboard التي تم فحصها؛ حقول الأسرار تستخدم password inputs أو masked/presence fields.

## الحزم المتبقية

- دمج سلسلة Campaign PRs بالترتيب قبل الاعتماد النهائي على تفاصيل الروابط: `#60 -> #61 -> #62 -> #63`.
- دمج Operations Persistence Foundation `#64` قبل تحويل بيانات Operations إلى DB models.
- دمج AI Core Readiness `#65` قبل بناء أدوات AI التنفيذية الحقيقية.
- تحويل foundation repositories إلى DB-backed repositories بعد تثبيت الموديلات النهائية.
- إضافة اختبارات smoke للروابط الإدارية وAPI auth بعد استقرار الدمج.

## المسارات الرئيسية

- `/dashboard/system-overview`
- `/dashboard/marketing`
- `/dashboard/marketing/campaign-operating-center`
- `/dashboard/marketing/campaign-links`
- `/dashboard/marketing/campaign-links/[id]`
- `/dashboard/marketing/ai-assistant`
- `/dashboard/marketing/tracking-hub`
- `/dashboard/operations`
- `/dashboard/operations/command-center`
- `/dashboard/operations/scheduler`
- `/dashboard/operations/production`
- `/dashboard/operations/archive`
- `/dashboard/operations/tasks`
- `/dashboard/operations/system`
- `/dashboard/operations/ai-assistant`
- `/dashboard/operations/archive/ai-assistant`
- `/dashboard/brand/center`

## PR cleanup notes

- PR #52 `Add executive system overview`: لم يدخل main بالكامل؛ حالته غير قابلة للدمج حاليًا ويحتاج rebase أو إعادة فتح كجزء من حزمة أحدث.
- PR #54 `Add integration provider foundation`: لم يدخل main بالكامل؛ لا تغلقه باعتباره merged. راجعه مقابل Shared Connections work قبل القرار.
- PR #30 `Add integration foundation and provider catalog`: يبدو superseded by #54 لأنه يلمس نفس ملفات provider foundation. التوصية: إغلاقه بعد التأكد أن #54 هو النسخة المعتمدة.
- PRs #37, #40, #43: تبدو قديمة ومتصلة بمراحل Operations foundation السابقة. التوصية: مراجعتها بعد #64؛ إن كانت مغطاة بالكامل داخل #64، أغلقها كتغييرات superseded بدل دمجها منفصلة.

## Known risks

- توجد عدة PRs مفتوحة ومكدسة؛ الدمج خارج الترتيب قد يسبب تضاربًا في صفحات Campaign وOperations.
- بعض APIs القديمة خارج نطاق الحزم الجديدة قد تحتاج نفس معيار no-store/auth audit لاحقًا.
- Operations persistence ما زال foundation وليس DB-backed، لذلك لا تعتمد عليه كحالة تشغيل دائمة.
- AI Core لا ينفذ tools فعليًا بعد؛ العقود جاهزة لكن التنفيذ يجب أن يبقى read-only أو write-proposed مع human approval.
- `npm run build` قد يفشل في بيئات بدون وصول إلى Google Fonts بسبب `next/font`; فرز أخطاء build يجب أن يسبق أي refactor.

## Next recommended package

`Dashboard Merge Readiness & Smoke Tests`

الهدف: ترتيب دمج PRs، إضافة smoke tests لمسارات dashboard الأساسية، وفحص API auth/no-store لكل endpoint إداري قبل أي نشر إنتاجي.
