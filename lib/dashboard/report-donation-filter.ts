import type { Prisma } from "@prisma/client";
export function donationStatusWhere(status: string | null | undefined): Prisma.DonationWhereInput | null {
  if (status === "PAID") return { status: "PAID", paidAt: { not: null } };
  if (status === "PENDING") return { status: "PAID", OR: [{ paidAt: null }, { paidAt: { isSet: false } }] };
  if (status === "FAILED") return { status: "FAILED" };
  return null;
}
