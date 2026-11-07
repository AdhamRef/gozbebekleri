import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { InstitutionQuickDonationEditor } from "./InstitutionQuickDonationEditor";

export default async function QuickDonationPage() {
  const session = await getServerSession(authOptions);
  if (!userHasDashboardPermission(session?.user, "siteContent")) redirect("/dashboard");
  return <InstitutionQuickDonationEditor />;
}
