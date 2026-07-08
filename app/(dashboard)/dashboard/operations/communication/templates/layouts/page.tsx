import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTemplateCenter } from "@/lib/communication/template-center-service";
import { EmailLayoutManager } from "../_components/EmailLayoutManager";

export const metadata = { title: "تصاميم الإيميل الثابتة | مركز التواصل" };
export const dynamic = "force-dynamic";

export default async function EmailLayoutsPage() {
  const { layouts } = await getTemplateCenter();

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs text-white/70">القوالب / تصاميم الإيميل الثابتة</p>
            <h1 className="mt-1.5 text-2xl font-black">تصاميم الإيميل الثابتة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">تصاميم قابلة لإعادة الاستخدام عبر عدة قوالب. يحتوي كل تصميم على خانة محتوى تُملأ من القالب.</p>
          </div>
          <Link href="/dashboard/operations/communication/templates" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">العودة للقوالب <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <EmailLayoutManager initialLayouts={layouts.map((l) => ({ id: l.id, name: l.name, description: l.description, status: l.status, isDefault: l.isDefault, unsubscribePlaceholder: l.unsubscribePlaceholder }))} />
    </main>
  );
}
