import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { NewDonation } from "./NewDonation";

export default async function NewDonationPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "donationsEdit");
  if (!access.allowed) redirect(access.redirectTo);
  return <NewDonation />;
}
