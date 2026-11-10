import type { NextRequest } from "next/server";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { hasGuestReceiptGrant } from "@/lib/donations/guest-payment-grant";

type ReceiptUser = {
  id?: string | null;
  role?: string | null;
  dashboardPermissions?: string[] | null;
} | null | undefined;

export function canAccessDonationReceipt(
  user: ReceiptUser,
  donorId: string,
  donationId: string,
  request: NextRequest,
): boolean {
  if (user?.id) {
    return user.id === donorId || userHasDashboardPermission(user, "revenue");
  }
  // A guessed donation ObjectId is not a credential.
  return hasGuestReceiptGrant(request, donationId);
}
