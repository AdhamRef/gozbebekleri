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
    <main className="space-y-5 p-4 sm:p-6" dir="rtl">
      <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs text-white/70">الجمهور / {TYPE_LABEL[list.type] ?? list.type}</p>
            <h1 className="mt-1.5 text-2xl font-black">{list.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">{list.description || "أدر أعضاء القائمة والقنوات، وأنشئ حملة أو جرّب قالبًا قبل الإرسال الحقيقي."}</p>
          </div>
          <Link href="/dashboard/operations/communication/audiences" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">العودة للجمهور <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <AudienceListDetail
        list={{ id: list.id, name: list.name, type: list.type, status: list.status, channels: list.channels, locale: list.locale }}
        members={members}
      />
    </main>
  );
}
