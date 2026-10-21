"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { ContentField, TextValues } from "@/lib/content-editor/contracts";
import { ImageUploadField } from "@/app/(dashboard)/dashboard/_components/ImageUploadField";
import { analyzeSeo } from "@/lib/content-editor/seo-analysis";
type Faq = { q: string; a: string };
export function SeoWorkspace({
  values,
  fields,
  renderField,
  onChange,
  locale,
  onUploadingChange,
  onNavigateField,
}: {
  values: TextValues;
  fields: ContentField[];
  renderField: (field: ContentField) => ReactNode;
  onChange: (key: string, value: string) => void;
  locale: string;
  onUploadingChange?: (uploading: boolean) => void;
  onNavigateField?: (key:string)=>void;
}) {
  const [tab, setTab] = useState("search");
  let faq: Faq[] = [];
  try {
    const parsed: unknown = JSON.parse(values.faqContent || "[]");
    if (Array.isArray(parsed)) faq = parsed.filter((item): item is Faq => !!item && typeof item.q === "string" && typeof item.a === "string");
  } catch {
    /* show a recoverable empty draft */
  }
  const title =
      values.seoTitle || values.metaTitle || values.title || values.name || "",
    description = values.seoDescription || values.metaDescription || "";
  const writeFaq = (next: Faq[]) =>
    onChange("faqContent", JSON.stringify(next));
  const audit=useMemo(()=>analyzeSeo(values,locale),[values,locale]);
  const attention=audit.findings.filter(f=>f.status!=="pass");
  const passed=audit.findings.filter(f=>f.status==="pass");
  const goToField=(key:string)=>{const field=fields.find(f=>f.key===key);if(field?.group==="seo"){setTab(["ogTitle","ogDescription","ogImage"].includes(key)?"share":"search");requestAnimationFrame(()=>{const target=window.document.getElementById(`content-${locale}-${key}`);target?.scrollIntoView({block:"center",behavior:"smooth"});target?.focus();});}else onNavigateField?.(key);};
  return (
    <div className="space-y-5">
      <nav
        aria-label="أقسام SEO"
        className="flex flex-wrap gap-2 rounded-xl border bg-white p-2"
      >
        {[
          ["search", "محركات البحث"],
          ["share", "المشاركة الاجتماعية"],
          ["audit", "الفحوص والجاهزية"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            className={`rounded-lg px-4 py-3 text-sm ${tab === id ? "bg-brand text-white" : "text-slate-600"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "search" ? (
        <>
          <label className="block space-y-2 rounded-xl border bg-white p-5">
            <span className="font-semibold">العبارة الرئيسية المستهدفة</span>
            <input
              id={`content-${locale}-seoKeyword`}
              className="w-full rounded-lg border p-3"
              value={values.seoKeyword || ""}
              onChange={(e) => onChange("seoKeyword", e.target.value)}
            />
          </label>
          {fields
            .filter((f) =>
              /^(seoTitle|seoDescription|metaTitle|metaDescription|imageAlt)$/.test(
                f.key,
              ),
            )
            .map(renderField)}
          <section className="rounded-xl border bg-white p-5">
            <h3 className="mb-4 font-semibold">
              معاينة Google · {locale.toUpperCase()}
            </h3>
            <p className="text-xl text-blue-800">{title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {description || "أضف وصف نتيجة البحث"}
            </p>
          </section>
          <label className="flex items-center justify-between gap-3 rounded-xl border bg-white p-5">
            <span>السماح لمحركات البحث بفهرسة هذه اللغة</span>
            <input
              id={`content-${locale}-seoNoIndex`}
              type="checkbox"
              role="switch"
              checked={values.seoNoIndex !== "true"}
              onChange={(e) =>
                onChange("seoNoIndex", e.target.checked ? "false" : "true")
              }
            />
          </label>
          <section id={`content-${locale}-faqContent`} tabIndex={-1} className="space-y-4 rounded-xl border bg-white p-5">
            <div className="flex justify-between">
              <h3 className="font-semibold">الأسئلة الشائعة</h3>
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => writeFaq([...faq, { q: "", a: "" }])}
              >
                إضافة سؤال
              </button>
            </div>
            <p className="text-xs leading-6 text-slate-500">
              تُعرض الأسئلة المحفوظة في الصفحة، وتطابقها البيانات المنظمة. راجع
              الحقائق قبل الحفظ.
            </p>
            {faq.map((item, i) => (
              <fieldset key={i} className="space-y-2 rounded-lg border p-3">
                <label className="block text-sm">
                  السؤال {i + 1}
                  <input
                    className="mt-2 w-full rounded border p-3"
                    value={item.q}
                    onChange={(e) =>
                      writeFaq(
                        faq.map((v, n) =>
                          n === i ? { ...v, q: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <label className="block text-sm">
                  الإجابة
                  <textarea
                    className="mt-2 w-full rounded border p-3"
                    rows={3}
                    value={item.a}
                    onChange={(e) =>
                      writeFaq(
                        faq.map((v, n) =>
                          n === i ? { ...v, a: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-red-700"
                  onClick={() => writeFaq(faq.filter((_, n) => n !== i))}
                >
                  حذف السؤال من المسودة
                </button>
              </fieldset>
            ))}
          </section>
        </>
      ) : null}
      {tab === "share" ? (
        <>
          <p className="rounded-xl bg-sky-50 p-4 text-sm">
            عند ترك حقول المشاركة فارغة، تُستخدم إعدادات البحث لهذه اللغة.
          </p>
          {fields
            .filter((f) => ["ogTitle", "ogDescription"].includes(f.key))
            .map(renderField)}
          <section id={`content-${locale}-ogImage`} tabIndex={-1} className="rounded-xl border bg-white p-5">
            <ImageUploadField
              onUploadingChange={onUploadingChange}
              label="صورة المشاركة لهذه اللغة"
              value={values.ogImage || ""}
              onChange={(url) => onChange("ogImage", url)}
            />
          </section>
          <section className="overflow-hidden rounded-xl border bg-white">
            {values.ogImage ? (
              // User-supplied upload URLs do not have a fixed image host.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.ogImage}
                alt={values.imageAlt || ""}
                className="h-48 w-full object-cover"
              />
            ) : null}
            <div className="space-y-2 p-5">
              <small className="text-slate-500">
                معاينة Facebook وWhatsApp
              </small>
              <h3 className="font-bold">{values.ogTitle || title}</h3>
              <p className="text-sm text-slate-600">
                {values.ogDescription || description}
              </p>
            </div>
          </section>
        </>
      ) : null}
      {tab === "audit" ? (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <h3 className="font-semibold">جاهزية تقنية وجودة تحريرية</h3>
          <p className="text-sm text-slate-500">
            اكتمال الحقول لا يضمن ترتيبًا في محركات البحث. راجع النص والمصادر.
          </p>
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-center text-sm"><div><strong className="block text-xl">{audit.words}</strong>كلمة</div><div><strong className="block text-xl">{audit.headingCount}</strong>عنوان فرعي</div><div><strong className="block text-xl">{audit.internalLinks}</strong>رابط داخلي</div></div>
          <p role="status" className="text-sm">{attention.length ? `${attention.filter(f=>f.status==="error").length} ملاحظة أساسية · ${attention.filter(f=>f.status==="warning").length} توصية للمراجعة` : "لم يرصد الفحص المحلي ملاحظات في المسودة الحالية."}</p>
          {attention.sort((a,b)=>a.status===b.status?0:a.status==="error"?-1:1).map(f=><article key={f.id} className={`rounded-xl border p-4 ${f.status==="error"?"border-red-200 bg-red-50":"border-amber-200 bg-amber-50/50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{f.label}</h4><button type="button" onClick={()=>goToField(f.field)} className="min-h-11 rounded-lg border bg-white px-3 py-2 text-xs">مراجعة الحقل</button></div><p className="mt-2 text-sm leading-7 text-slate-600">{f.detail}</p></article>)}
          <details className="rounded-xl border p-4"><summary className="cursor-pointer py-2 text-sm font-semibold">فحوص اجتازت المراجعة المحلية ({passed.length})</summary><div className="divide-y">{passed.map(f=><div key={f.id} className="py-3"><p className="text-sm font-semibold text-emerald-700">{f.label}</p><p className="mt-1 text-xs leading-6 text-slate-500">{f.detail}</p></div>)}</div></details>
          <p className="text-xs leading-6 text-slate-500">الفحص يعتمد على المسودة الحالية وبنية محتواها. لا يجلب بيانات Search Console أو حجم البحث، ولا يؤكد استجابة الروابط أو ترتيب الصفحة.</p>
        </section>
      ) : null}
    </div>
  );
}
