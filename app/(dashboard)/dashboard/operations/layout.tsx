import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";

export const dynamic = "force-dynamic";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "operations");
  if (!access.allowed) redirect(access.redirectTo);

  return children;
}
