import type { Prisma } from "@prisma/client";

/** One Istanbul calendar window shared with the donation table. */
export function donationChartStatusWhere(
  status: string | null,
  startDate: Date,
  endDate: Date,
): Prisma.DonationWhereInput {
  const paid: Prisma.DonationWhereInput = { status: "PAID", paidAt: { gte:startDate,lte:endDate } };
  const failed: Prisma.DonationWhereInput = { status: "FAILED", createdAt: { gte:startDate,lte:endDate } };
  const pending: Prisma.DonationWhereInput = {
    status:"PAID",createdAt:{gte:startDate,lte:endDate},
    OR:[{paidAt:null},{paidAt:{isSet:false}}],
  };
  switch(status) {
    case "PAID": return paid;
    case "FAILED": return failed;
    case "PENDING": return pending;
    case "all": return { OR:[paid,failed,pending] };
    default: return { OR:[paid,failed] };
  }
}
export function donationChartTypeWhere(type: string | null): Prisma.DonationWhereInput | null {
  if(type==="ONE_TIME")return { OR:[{subscriptionId:null},{subscriptionId:{isSet:false}}] };
  if(type==="MONTHLY")return { subscriptionId:{not:null} };
  return null;
}
