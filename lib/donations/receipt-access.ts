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
  // OAuth return can retain an original guest receipt cookie even before
  // the account is linked. The signed grant authorizes only this receipt,
  // and must never imply ownership of an unrelated donor account.
  return Boolean((user?.id &&
    (user.id === donorId || userHasDashboardPermission(user, "revenue"))) ||
    hasGuestReceiptGrant(request, donationId));
}
