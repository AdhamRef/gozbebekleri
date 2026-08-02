import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTemplateCenter } from "@/lib/communication/template-center-service";
import { EmailLayoutManager } from "../_components/EmailLayoutManager";

export const metadata = { title: "تصاميم الإيميل الثابتة | مركز التواصل" };
export const dynamic = "force-dynamic";

export default async function EmailLayoutsPage() {
  const { layouts } = await getTemplateCenter();

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-brand">القوالب / تصاميم الإيميل الثابتة</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">تصاميم الإيميل الثابتة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">تصاميم قابلة لإعادة الاستخدام عبر عدة قوالب. يحتوي كل تصميم على خانة محتوى تُملأ من القالب.</p>
          </div>
          <Link href="/dashboard/operations/communication/templates" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand/50 hover:text-brand">العودة للقوالب <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <EmailLayoutManager initialLayouts={layouts.map((l) => ({ id: l.id, name: l.name, description: l.description, status: l.status, isDefault: l.isDefault, unsubscribePlaceholder: l.unsubscribePlaceholder }))} />
    </main>
  );
}
