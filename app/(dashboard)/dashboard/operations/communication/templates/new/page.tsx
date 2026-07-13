import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewTemplateWizard } from "../_components/NewTemplateWizard";

export const metadata = { title: "إنشاء قالب | مركز التواصل" };
export const dynamic = "force-dynamic";

export default function NewTemplatePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold text-[#025EB8]">القوالب / إنشاء قالب</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">إنشاء قالب</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">اختر النوع والقناة، جهّز المحتوى والمتغيرات، ثم عاين واحفظ.</p>
          </div>
          <Link href="/dashboard/operations/communication/templates" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-[#025EB8]/50 hover:text-[#025EB8]">العودة للقوالب <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>
      <NewTemplateWizard />
    </main>
  );
}
