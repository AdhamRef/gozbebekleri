import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import CampaignLinksPerformancePage from "../../marketing-intelligence/campaign-links/page";

export const metadata = { title: "الروابط والإسناد | لوحة التحكم" };
export const dynamic = "force-dynamic";

export default async function MarketingAttributionPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "referrals");
  if (!access.allowed) redirect(access.redirectTo);
  return <CampaignLinksPerformancePage />;
}
