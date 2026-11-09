# قرة العيون — تقرير تنفيذ إغلاق استردادات Stripe وبوابة إصدار PR #195

**التاريخ:** 9 نوفمبر 2026  
**نطاق التنفيذ:** Draft PR #195 — `audit/goz-round2-idempotency-locale-20261109` إلى `main`  
**حالة الدمج والنشر:** **NO-GO: لم يُدمج ولم يُنشر في الإنتاج**.

## 1. بنية الاسترداد المنفذة

- `StripeRefundSettlement`: سجل فريد بمفتاح `refund.id`، حالة `APPLIED/REVERSED/PENDING`، هوية التبرع والـCharge والـPaymentIntent والـInvoice، المبلغ بوحدات Stripe الصغرى وعملة العملية. يُنشأ/يُحدّث مع الحركات المالية في **معاملة Prisma/MongoDB واحدة**. فهرس `_id` فريد، وفهارس `donationId,status` و`chargeId`؛ لا تغييرات تلقائية على إنتاج المؤسسة.
- `reconcileStripeRefund`: يعيد جلب Refund وCharge وPaymentIntent من Stripe ويتحقق من الحالة الفعلية والعملة والمبلغ المحصل وربط التبرع **الوحيد المسدد**، مع الرجوع إلى `InvoicePayment` عند غياب ربط invoice من واجهات Stripe الحديثة. يمنع تبرع مؤسسة أخرى، والمراجع غير المعروفة والتوزيعات الأصلية غير الموثقة.
- `charge.refunded` يطلب قائمة الاستردادات من Stripe ثم يتعامل مع كل ID مستقلًا، و`refund.created/updated/failed` تُمرر عبر المصدر الموثق نفسه. `pending` لا ينقص الإيراد؛ `succeeded` ينقصه؛ `failed/canceled` يعكس قيد الاسترداد السابق إن وُجد.
- تحفظ Donation مبالغ **الإجمالي والمسترد والصافي** مع الفصل بين أصل التبرع ودعم الفريق والرسوم بالعملة الأصلية وUSD من **لقطة التحويل التاريخية**. لا يُغيّر `paidAt` أو `status=PAID`. تُحدّث `Campaign.currentAmount` و`Category.currentAmount` حسب بنود العملية الأصلية؛ **`baselineAmount` لا يتغير**.
- يرفض الكود الاسترداد عندما لا يمكن إسناده بصورة وحيدة أو عندما لا توجد قيم FX تاريخية أو عندما تكون توزيعات المشاريع ناقصة. لا يُستبدل الرفض بتخمين قيمة صحيحة.
- تتعامل المحاسبة مع Stripe currencies ذات وحدات صفرية مثل JPY. تظل المعاملات القديمة غير المعروفة بحاجة جرد/تسوية موجهة قبل الإنتاج.

## 2. مكونات تغيّرت فعليًا

| الملف | العمل |
|---|---|
| `prisma/schema.prisma` | Refund ledger + حقول التجميع الاختيارية للبيانات القديمة |
| `lib/donations/stripe-refund-settlement.ts` | تسوية أصلية متزامنة + تأكيد Stripe + التوزيعات والاسترداد العكسي |
| `app/api/stripe/webhook/route.ts` | Webhooks الاسترداد + تثبيت توزيع أول فاتورة |
| `scripts/qa-stripe-signed-http-isolated.mjs` | اختبارات HTTP بتوقيع Stripe حقيقي على Prisma+Mongo مستقلة |
| `scripts/preflight-stripe-ledgers.mjs` | فحص READ-ONLY وتفعيل فهارس اختياري لا يعمل إلا باعتماد موثق |
| `lib/dashboard/donation-refund-finance.ts` | إسقاط Gross/Refund/Net موحّد بسعر التحويل التاريخي |
| `lib/dashboard/donation-export.ts` | أعمدة ملخصات XLSX وCSV للإجمالي والاستردادات والصافي |
| `app/api/admin/donations/export/route.ts` | إدراج القيم الفعلية من سجل التبرع في التصدير |
| `app/api/admin/donations/chart/route.ts` | الإجمالي/المسترد/الصافي حسب paidAt |
| `app/api/admin/stats/route.ts` | KPIs منفصلة إجمالي/مسترد/صافٍ |
| `app/api/users/[id]/route.ts` | ملف المتبرع يحفظ ويعرض إجمالي/مسترد/صافٍ |
| `app/(dashboard)/dashboard/page.tsx` | بطاقات gross/refund/net ظاهرة |
| `components/dashboard/ViewUserProfileDialog.tsx`, `lib/dashboard/user-profile-card.ts` | واجهة المتبرع تعرض المسترد والصافي عند توفرهما |
| `tests/content-editor/donation-export.test.ts` | اختبار أعمدة Excel/CSV ووصلة الملخص المحلي |
| `tests/ported-systems/donor-profile-http.test.mjs` | اختبار إجمالي/مسترد/صافي بيانات المتبرع والصلاحيات |
| `.github/workflows/ported-systems.yml` | اختبار HTTP/Mongo للاستردادات **إجباري** وليس مجرد تحذير |

## 3. أدلة اختبارات محلية فعلية

**قاعدة الاختبار فقط:** MongoDB 7.0.15 Replica Set مؤقتة + Prisma Client حقيقي + HTTP محلي مع توقيع Stripe صالح. تُحاكى قراءات Refund/Charge/PaymentIntent/InvoicePayment، **بلا أي اتصال بشبكة Stripe وبلا خصم أو استرداد حقيقي**.

- **26/26 PASS** على الاختبار الموسع، ومنه: التوقيع الفاسد، فاتورتان متزامنتان، replay، Checkout خارج الترتيب، أول فشل، التجديد، الإلغاء/إعادة التفعيل، استرداد 40 ثم 60 من أصل 100، تكرار Refund بالتزامن، استردادان مختلفان بالتزامن، حالة pending، failed بعد success، مجهول الهوية، اختلاف العملة/المبلغ، Refund يصل قبل تحصيل محلي، حفظ أرصدة متعددة لمشروعين وتصنيفين، تجزئة $110 إلى $100 تبرع و$5 دعم فريق و$5 رسوم ثم Refund $55، تحويل JPY صفري الكسور، رفض ترجيع مبلغ دون توزيع أصلي، وإنشاء/فحص فهارس تسوية منفصلة.
- عينة الحساب: **$110 إجمالي → $55 مسترد → $55 صافي**، منها **$100 أصل → $50 مسترد → $50 صافٍ**، ودعم فريق $5→$2.5 ورسوم $5→$2.5. مشاريع $60/$40 تُصبح $30/$20 وتصنيفات $70/$30 تُصبح $35/$15. لا حذف للدفعة الأصلية ولا تغيير تاريخها.
- اختبارات التقارير والمحتوى **128/128 PASS**؛ الأنظمة المنقولة **46/46 PASS**؛ الموقع **44/44 PASS**؛ TypeScript `typecheck:ported-systems` **PASS** على النسخة التي فُحصت. إعادة التحقق من GitHub Actions وVercel على آخر Commit واجبة بعد كل تحديث جديد للفرع.

## 4. شروط الإنتاج التي لم تتحقق

| البوابة | النتيجة |
|---|---|
| إثبات قاعدة MongoDB الخاصة بقرّة العيون من إعداداتها المخولة | **BLOCKED**؛ المشاريع المتصلة لم توثق ملكية قاعدة قرة العيون |
| Backup موثق واستعادة فعلية لنسخة من **إنتاج قرة العيون** | **BLOCKED**؛ لم تُجرَ، ولا يُدّعى خلاف ذلك |
| إنشاء `StripeRefundSettlement` و`StripeInvoiceSettlement` وفهارسهما على قاعدة قرة العيون الإنتاجية | **BLOCKED** حتى إثبات Backup/Restore |
| استردادات تاريخية/سجلان مكرران في قاعدة الإنتاج مقارنةً بـStripe | **BLOCKED**؛ لا تعديل/حذف دون أدلة |
| حساب Stripe Test Mode الخاص بقرّة العيون | **BLOCKED**؛ الموصول فقط حساب live باسم Tribune Charity ولم يُستخدم |
| Preview Desktop/Mobile بثلاثة أدوار ADMIN/STAFF/DONOR | **BLOCKED**؛ Preview يخضع لـVercel SSO ولا توجد جلسات مصرح بها |
| أمن PR #153 كاملاً + حماية إنشاء التبرعات من PR #193 | **جزئي**؛ لا تدّعي اعتمادًا أمنيًا شاملاً |
| نقل وظائف PR #156 والتتبع الحي Meta Purchase/Donate | **جزئي**؛ المعرّفات/تسجيل الأحداث موجود، تكامل حقيقي غير معتمد |
| اللغات | **محفوظة:** `ar,en,fr,tr,id,pt,es,de`، الافتراضية `ar`، دون توسيع |
| Quick Donation وطلبات الاشتراك الجديدة | **مقفلتان**؛ SMS خارج النطاق؛ SEO/الترجمة مؤجلان |

## 5. bootstrap workflow

`.github/workflows/bootstrap-integration-settings-vercel.yml` Workflow تاريخي يحدد صراحةً فرع `agent/secure-integration-settings-backend` وPR #127 المغلق. لا يعمل اختبارًا مطلوبًا تلقائيًا في PR #195 عند تحديث ملفات Refund. **سبب فشل تشغيل قديم بعينه غير مثبت دون Job Logs.** لا حُذفت الوظيفة ولا جرى تعديل شروط نجاحها لإخفاء فشل.

## 6. قرار الإصدار

**NO-GO لإنتاج قرة العيون** حتى:
1. اعتماد قاعدة المؤسسة وتحديد مصدر البيانات ونجاح Backup/Restore حقيقي.
2. فحص الاستردادات والسجلين القديمين + الاستعداد المسبق للفهرسة.
3. اختبار Stripe Test Mode الفعلي والمؤشرات المالية والتقارير مقابل البيانات، دون بطاقات حقيقية.
4. إغلاق P0 الأمني والحصول على وصول Preview رسمي واختبار ADMIN/STAFF/DONOR Desktop/Mobile.
5. نجاح نفس SHA النهائي في GitHub Actions وVercel Preview، وبعدها فقط اعتماد GO ثم الدمج والنشر والتحقق من SHA الإنتاج.

**إنتاج Vercel المرجعي قبل هذا الإصدار:** SHA `0105005cbfa07b521cbc3975080ccdd7c68fc842`، deployment `dpl_E2JdJ4heuwuDYUnh8wTzF6pNtXau`. لم تُغيَّر البوابات أو بيانات المتبرعين، ولم تُجرَ خصومات أو استردادات فعلية، ولم يُدمج PR #195 أو يُنشر إنتاجيًا. rollback للكود لا يعيد بيانات MongoDB.
