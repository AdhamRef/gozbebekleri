import Link from "next/link";

export const metadata = {
  title: "مركز المحتوى والتشغيل | لوحة التحكم",
};

export default function OperationsAiAssistantLegacyPage() {
  return (
    <div className="space-y-4 p-4 sm:p-6" dir="rtl">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[#025EB8]">صفحة قديمة</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">تم نقل مساعد المحتوى</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          تم إخفاء صفحة التجهيز التقنية الخاصة بالمساعد. استخدم مركز المحتوى والتشغيل لمتابعة العمل اليومي.
        </p>
        <Link
          href="/dashboard/operations"
          className="mt-5 inline-flex rounded-md bg-[#025EB8] px-4 py-2 text-sm font-bold text-white hover:bg-[#024f99]"
        >
          فتح مركز المحتوى والتشغيل
        </Link>
      </div>
    </div>
  );
}
