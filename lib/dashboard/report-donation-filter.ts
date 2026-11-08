import type { Prisma } from "@prisma/client";
/**
 * Shared report/list calendar contract: a collected gift belongs to its paidAt
 * date, while unsuccessful and unconfirmed attempts belong to createdAt.
 * AND-compose this with the payment-status and campaign filters; Prisma
 * MongoDB's unset paidAt is distinct from null.
 *
 * No provider, checkout or subscription state is changed by this read filter.
 */
export function reportDonationPeriodWhere(
  range: { gte?: Date; lte?: Date },
): Prisma.DonationWhereInput | null {
  if (range.gte === undefined && range.lte === undefined) return null;
  return {
    OR: [
      { status: "PAID", paidAt: range },
      {
        status: "PAID",
        createdAt: range,
        OR: [{ paidAt: null }, { paidAt: { isSet: false } }],
      },
      { status: { not: "PAID" }, createdAt: range },
    ],
  };
}

export function donationStatusWhere(status: string | null | undefined): Prisma.DonationWhereInput | null {
  if (status === "PAID") return { status: "PAID", paidAt: { not: null } };
  if (status === "PENDING") return { status: "PAID", OR: [{ paidAt: null }, { paidAt: { isSet: false } }] };
  if (status === "FAILED") return { status: "FAILED" };
  return null;
}
