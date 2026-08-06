import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Megaphone } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CampaignDetailClient } from "./_components/CampaignDetailClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "تفاصيل الحملة | التواصل" };

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "messages");
  if (!access.allowed) redirect(access.redirectTo);
  const { id } = await params;

  return (
    <div className="min-h-0" dir="rtl">
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="الحملات التسويقية"
          title="تفاصيل الحملة"
          description="القالب والجمهور وحالة الحملة — والإرسال بعد الاعتماد."
          icon={Megaphone}
        />
        <CampaignDetailClient id={id} />
      </div>
    </div>
  );
}
