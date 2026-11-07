# قرة العيون — مسودات أصلية لقوالب التواصل (غير منشورة)

هذه النصوص مخصصة لعمل قرة العيون وليست منسوخة من منبر الأقصى. لا تتضمن متبرعين أو وسائل اتصال أو قوالب أو مفاتيح من الموقع المرجعي. لا يُسمح باستيرادها تلقائيًا إلى قاعدة البيانات أو إرسالها إلى متبرعين قبل مراجعة الفريق وربط الأحداث والتحقق من المعاينات متعددة اللغات.

## نظام التصميم
- الهوية: الأزرق المؤسسي الموجود في الموقع، خلفية بيضاء مع لمسات أزرق فاتح، وشعار قرة العيون الموجود في أصول هذا الموقع وحده.
- البريد: رأس واضح، عنوان رئيسي، ملخص مالي مستقل للتبرع ودعم الفريق والرسوم، تفاصيل المشروع، زر واحد واضح، وتذييل التواصل وإلغاء الاشتراك عند اللزوم.
- واتساب: نص أقصر، اتجاه RTL للعربية، وسيلة واحدة للإجراء، ومعرف العملية من سجلات قرة العيون فقط.
- لا توضع روابط ثابتة لصفحات فشل أو شهادات عربية داخل القوالب الأخرى؛ تُولّد روابط اللغة والبيانات من القيم المحفوظة لدى قرة العيون.
- حقول مثل {{donor_first_name}} و{{project_title}} و{{amount}} و{{currency}} و{{receipt_url}} و{{manage_url}} تُربط بالخادم، وتخضع للهروب المناسب من HTML. لا تُرسل قوالب بمتغيرات ناقصة.

## رسالة ترحيب — حساب جديد
**AR — عنوان البريد:** أهلًا بك في قرة العيون | بداية أثر يستحق أن يُروى

مرحبًا {{donor_first_name}}،

يسعدنا انضمامك إلى قرة العيون. من هنا يمكنك التعرف إلى المشاريع الإنسانية ومتابعة أثر مساهماتك والاحتفاظ بسجلات تبرعاتك في مكان واحد.

حسابك جاهز لتختار المجال الذي يلامس قلبك. وجودك معنا يفتح بابًا جديدًا للأمل لدى أسر وأطفال ينتظرون من يقف بجانبهم.

الإجراء: **اكتشف المشاريع**

**EN — Subject:** Welcome to Gözbebekleri | Your place in a story of care

Hello {{donor_first_name}},

Welcome to Gözbebekleri. Your account makes it easier to explore humanitarian projects, review your contributions and follow the causes you choose to support.

Start with a project that matters to you. Thoughtful giving can make a meaningful difference for children and families facing difficult circumstances.

CTA: **Explore projects**

**TR — Konu:** Gözbebekleri'ne hoş geldiniz | İyiliğe açılan yeni bir kapı

Merhaba {{donor_first_name}},

Gözbebekleri ailesine hoş geldiniz. Hesabınız üzerinden insani yardım projelerini inceleyebilir, bağış geçmişinizi görebilir ve destek verdiğiniz çalışmaları takip edebilirsiniz.

Sizin için anlamlı olan bir projeyle başlayın. Her destek, zor şartlardaki ailelerin ve çocukların yarınlarına dokunabilir.

Buton: **Projeleri keşfet**

## التبرع الناجح — إيصال وحالة
**AR — عنوان البريد:** مساهمتك وصلت بنجاح | تفاصيل تبرعك لدى قرة العيون

مرحبًا {{donor_first_name}}،

تم تأكيد مساهمتك في «{{project_title}}». شكرًا لأنك اخترت أن تكون جزءًا من هذا العمل الإنساني.

مبلغ المشروع: {{amount}} {{currency}}
دعم إدارة العمل: {{team_support}} {{currency}}
الرسوم المغطاة: {{fees}} {{currency}}
الإجمالي المحصّل: {{total}} {{currency}}
رقم العملية: {{donation_reference}}

احتفظ بالإيصال لمراجعة تفاصيل مساهمتك في أي وقت.

الإجراء: **عرض الإيصال**

**EN — Subject:** Your contribution is confirmed | Gözbebekleri receipt

Hello {{donor_first_name}},

Your contribution to “{{project_title}}” has been confirmed. Thank you for choosing to stand alongside children and families in need.

Project gift: {{amount}} {{currency}}
Operational support: {{team_support}} {{currency}}
Covered fees: {{fees}} {{currency}}
Total charged: {{total}} {{currency}}
Reference: {{donation_reference}}

CTA: **View receipt**

## فشل الدفع — إعادة محاولة آمنة
**AR — عنوان البريد:** لم يكتمل تبرعك بعد | قرة العيون

مرحبًا {{donor_first_name}}،

بدأت مساهمة في «{{project_title}}»، لكننا لم نتلقَّ تأكيدًا بنجاح الدفع. لم نعتبر هذه المحاولة تبرعًا مكتملًا، ولن تظهر ضمن التبرعات المحصّلة.

يمكنك مراجعة المحاولة وإكمالها عبر صفحة آمنة. لا ترسل بيانات بطاقتك في رد على هذه الرسالة.

الإجراء: **مراجعة التبرع**

**EN — Subject:** Your donation has not been confirmed | Gözbebekleri

Hello {{donor_first_name}},

We could not confirm the payment for “{{project_title}}”. This attempt has not been counted as a completed donation.

You can review your attempt securely. Please never send card details in an email reply.

CTA: **Review donation**

## الاشتراكات — تحديث واضح
**AR — عنوان البريد:** تحديث اشتراكك في قرة العيون

مرحبًا {{donor_first_name}}،

هذه رسالة بخصوص مساهمتك الدورية في «{{project_title}}».

الدورية: {{frequency_label}}
حالة الاشتراك المؤكدة: {{subscription_status}}
آخر دفعة مؤكدة: {{last_paid_at}}
الدفعة القادمة: {{next_billing_at}}

يمكنك مراجعة الاشتراك وإدارته من حسابك. لا تُستخدم كلمة «نشط» قبل تأكيد الدفعة الأولى.

الإجراء: **إدارة اشتراكي**

## ما تبقى قبل تفعيل القوالب
- كتابة ومراجعة نسخ FR / ID / PT / ES / DE محليًا بواسطة مراجعين لغويين؛ لا تُستخدم ترجمة حرفية أو نص إنجليزي احتياطي دون إظهار اللغة.
- استكمال EN/TR للقوالب غير المكتملة ومراجعة هوية كل لغة وتصميم الاستجابة.
- ربط الأحداث وحالات الدفع والاشتراك الحقيقية، والصلاحيات والفواصل الزمنية وعدم إزعاج المتبرعين.
- تجربة حقيقية في بيئة الاختبار لكل من البريد وواتساب والحالات السليمة والفاشلة، دون إرسال جماعي إلى متبرعي الإنتاج.
