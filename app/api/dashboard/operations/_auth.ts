import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";

export const operationsNoStoreHeaders = { "Cache-Control": "no-store" };

export async function requireOperationsApiAccess() {
  const session = await getServerSession(authOptions);
  return requireAdminOrDashboardPermission(session, "campaigns");
}
