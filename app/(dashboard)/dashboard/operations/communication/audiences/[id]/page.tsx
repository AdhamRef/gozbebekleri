import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAudienceList } from "@/lib/communication/audience-list-service";
import { AudienceListDetail } from "../_components/AudienceListDetail";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { CUSTOM: "قائمة مخصصة", TEST: "قائمة اختبار" };

export default async function AudienceListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAudienceList(id);
  if (!data) notFound();
  const { list, members } = data;

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold text-brand">الجمهور / {TYPE_LABEL[list.type] ?? list.type}</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{list.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{list.description || "أدر أعضاء القائمة والقنوات، وأنشئ حملة أو جرّب قالبًا قبل الإرسال الحقيقي."}</p>
          </div>
          <Link href="/dashboard/operations/communication/audiences" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand/50 hover:text-brand">العودة للجمهور <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <AudienceListDetail
        list={{ id: list.id, name: list.name, type: list.type, status: list.status, channels: list.channels, locale: list.locale }}
        members={members}
      />
    </main>
  );
}
