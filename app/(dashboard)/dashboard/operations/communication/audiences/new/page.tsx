import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateAudienceListWizard } from "../_components/CreateAudienceListWizard";
import { getBrevoSmsConfig, getNetgsmSmsConfig } from "@/lib/communication/provider-env";

export const dynamic = "force-dynamic";

export default async function NewAudienceListPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const defaultType = sp.type === "test" ? "TEST" : "CUSTOM";
  // SMS is "enabled" once any SMS provider is configured (Brevo intl or Netgsm Turkey).
  const smsEnabled = getBrevoSmsConfig().configured || getNetgsmSmsConfig().configured;

  return (
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#025EB8]">الجمهور / {defaultType === "TEST" ? "قائمة اختبار جديدة" : "قائمة مخصصة جديدة"}</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">{defaultType === "TEST" ? "إنشاء قائمة اختبار" : "إنشاء قائمة مخصصة"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">حدّد الأساسيات، أضف متبرعين حقيقيين أو جهة اختبار، ثم راجع واحفظ.</p>
          </div>
          <Link href="/dashboard/operations/communication/audiences" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#025EB8]/50 hover:text-[#025EB8]">العودة للجمهور <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <CreateAudienceListWizard defaultType={defaultType} smsEnabled={smsEnabled} />
    </main>
  );
}
