# اصنع أثرًا لطفل — بنية المشروع

```
التبرع التفاعلي.dc.html   الواجهة (عرض فقط — لا بيانات ولا نصوص)
التبرع الدوري.dc.html     صفحة التبرع الدوري

src/
  data.js                 المناطق · الشخصيات · الاحتياجات · هندسة المسرح
  character-engine.js     بناء المشهد من البيانات (compose · stateOf)
  cart-store.js           حالة السلة المركزية + محوّل الحفظ
  services.js             projectService · currency · checkout · dev
  i18n.js                 نصوص ar / tr / en

characters/<region>/      base.webp · dressed.webp · carrying.webp
shared-layers/            طبقات مشتركة على نفس body rig
assets/                   أيقونات البطاقات (item-<key>.png)
```

## أنواع الاحتياجات

| النوع | السلوك |
|---|---|
| `state` | يبدّل صورة الشخصية كاملة |
| `aligned` | طبقة مطابقة لكانفس الشخصية |
| `prop` | عنصر مستقل في فتحة مسرح ثابتة |

## حالات الشخصية (`STATES`)

أول حالة تتحقق كل شروطها هي المعروضة.

| الحالة | الشروط | تغطي |
|---|---|---|
| `carrying` | ملابس + تعليم + غذاء | غذاء |
| `dressed` | ملابس | — |

## إضافة منطقة جديدة

1. `characters/<id>/base.webp` (+ صور الحالات).
2. سطر `region("<id>", …)` في `REGIONS`.

## تفعيل الطبقات المشتركة

عندما تصل طبقات موزونة على body rig المنطقة، اضبط `alignedAssets: true` لها — تُلغى كل المعايرات تلقائيًا.

## وضع التطوير

`?dev=1` يعرض حالة الأصول وأداة Asset QA (Base only / Layer only / Base + Layer / opacity).

## بانتظار التكامل

`projectService` و`checkout` محوّلان وهميان — يُستبدلان بنظام الموقع دون تغيير الواجهة.
