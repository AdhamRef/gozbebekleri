import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateAudienceListWizard } from "../_components/CreateAudienceListWizard";

export const dynamic = "force-dynamic";

export default async function NewAudienceListPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const defaultType = sp.type === "test" ? "TEST" : "CUSTOM";

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs text-white/70">الجمهور / {defaultType === "TEST" ? "قائمة اختبار جديدة" : "قائمة مخصصة جديدة"}</p>
            <h1 className="mt-1.5 text-2xl font-black">{defaultType === "TEST" ? "إنشاء قائمة اختبار" : "إنشاء قائمة مخصصة"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">حدّد الأساسيات، أضف متبرعين حقيقيين أو جهة اختبار، ثم راجع واحفظ.</p>
          </div>
          <Link href="/dashboard/operations/communication/audiences" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">العودة للجمهور <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <CreateAudienceListWizard defaultType={defaultType} />
    </main>
  );
}
