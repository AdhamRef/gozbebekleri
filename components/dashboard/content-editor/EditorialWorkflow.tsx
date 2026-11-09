"use client";
import { EDITORIAL_LABELS, type EditorialAction } from "@/lib/content-localization/editorial-policy";

const descriptions: Partial<Record<EditorialAction, string>> = {
  proofread: "تصحيح الأخطاء اللغوية والإملائية مع الحفاظ على المعنى.",
  improve: "صياغة أوضح وأكثر ملاءمة للجمهور، دون إضافة حقائق.",
  format: "تنظيم العناوين والفقرات والقوائم لسهولة القراءة.",
  "content-seo": "تحسين النص لمحركات البحث مع الحفاظ على أسلوبه.",
  "review-translation": "مراجعة دقة الترجمة ومصطلحاتها مقابل العربية.",
};
export function EditorialWorkflow({ locale, approved, needsUpdate, sourceKnown, busy, dirty, lastAction, onAction, onApprove, onArabic, onHistory }: { locale: string; approved: boolean; needsUpdate: boolean; sourceKnown: boolean; busy: boolean; dirty: boolean; lastAction?: string; onAction: (action: EditorialAction) => void; onApprove: () => void; onArabic: () => void; onHistory: () => void }) {
  return <section aria-label="مسار جودة المحتوى" className="space-y-5" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-bold">كيف تريد تحسين النص؟</h2><p className="mt-1 text-sm text-slate-500">ابدأ بالتهيئة الشاملة، ثم راجع الاقتراح واحفظه. اعتمد العربية عندما تصبح جاهزة، ثم ترجم منها اللغات الأخرى.</p></div>
      <button type="button" disabled={busy || dirty} className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40" onClick={onHistory}>النسخ السابقة والاسترجاع</button>
    </div>
    {dirty ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">احفظ تعديلاتك أولًا لتعمل الأدوات على آخر نسخة محفوظة.</p> : null}
    <button type="button" disabled={busy||dirty||(locale!=="ar"&&(!approved||needsUpdate))} onClick={()=>onAction("prepare")} className="block w-full rounded-xl border border-brand/30 bg-brand/5 p-5 text-start disabled:opacity-40"><span className="block font-semibold text-brand">تهيئة شاملة للنشر</span><span className="mt-2 block text-sm leading-7 text-slate-600">تدقيق لغوي، وتحسين الصياغة وملاءمتها للجمهور والبحث، ثم تنسيق العناوين والفقرات. راجع النتيجة واحفظها؛ اعتماد المصدر والترجمات يبقى بيدك.</span></button>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer py-2 text-sm font-semibold">أدوات متخصصة · اختر خطوة واحدة</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">
      {(["proofread", "improve", "format", "content-seo", "review-translation"] as const).filter(action => action === "proofread" ? locale === "ar" : action === "review-translation" ? locale !== "ar" : true).map(action => <button key={action} type="button" aria-label={EDITORIAL_LABELS[action]} aria-describedby={`editor-action-${action}`} onClick={() => onAction(action)} disabled={busy || dirty || (locale !== "ar" && !approved)} className="rounded-xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-brand/40 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-40"><span className="block text-sm font-semibold">{EDITORIAL_LABELS[action]}</span><span id={`editor-action-${action}`} className="mt-1 block text-xs leading-6 text-slate-500">{descriptions[action]}</span></button>)}
    </div></details>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
      <div><h3 className="text-sm font-semibold">المصدر العربي للترجمة</h3><p role="status" className={`mt-1 text-xs ${approved ? "text-emerald-700" : "text-amber-800"}`}>{approved ? "المصدر العربي معتمد لهذه النسخة" : "راجع العربية واعتمدها عندما تصبح جاهزة للترجمة."}{locale !== "ar" ? needsUpdate ? " · تغيّرت العربية؛ حدّث هذه الترجمة." : !sourceKnown ? " · ارتباط هذه الترجمة بالمصدر يحتاج مراجعة." : " · هذه الترجمة مرتبطة بالمصدر الحالي." : ""}</p></div>
      {locale === "ar" ? <button type="button" disabled={busy || dirty || approved} onClick={onApprove} className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-40">{approved ? "العربية معتمدة" : "اعتماد العربية للترجمة"}</button> : <button type="button" disabled={busy} onClick={onArabic} className="rounded-lg border bg-white px-3 py-2 text-sm">مراجعة المصدر العربي</button>}
    </div>
    <p className="text-xs leading-6 text-slate-400">تظل الآيات والروابط والمبالغ والإعدادات المحمية خارج التعديل الآلي.{lastAction ? ` آخر إجراء محفوظ: ${EDITORIAL_LABELS[lastAction as EditorialAction] || ({ translate: "الترجمة", seo: "اقتراح SEO", restore: "استعادة نسخة" } as Record<string, string>)[lastAction] || "تحرير المحتوى"}.` : ""}</p>
  </section>;
}
