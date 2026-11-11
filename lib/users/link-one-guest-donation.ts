import { prisma } from "@/lib/prisma";

/** Claim ONLY the donation covered by a signed grant. Never merge every
 * donation of a guest donor merely because they share an unverified email/phone.
 * For recurring donations, the same scoped subscription's installments follow.
 */
export async function linkOneGuestDonationToTarget(
  donationId: string,
  guestUserId: string,
  targetUserId: string,
): Promise<
  {ok:true;movedDonations:number;alreadyLinked?:boolean} |
  {ok:false;reason:"TARGET_NOT_FOUND"|"GUEST_NOT_FOUND"|"GUEST_NOT_ELIGIBLE"}
> {
  if (guestUserId === targetUserId) {
    return {ok:true,movedDonations:0,alreadyLinked:true};
  }
  const [target, guest, donation] = await Promise.all([
    prisma.user.findUnique({where:{id:targetUserId},select:{id:true}}),
    prisma.user.findUnique({
      where:{id:guestUserId},
      select:{id:true,password:true,accounts:{select:{id:true},take:1}},
    }),
    prisma.donation.findUnique({
      where:{id:donationId},
      select:{id:true,donorId:true,subscriptionId:true},
    }),
  ]);
  if (!target) return {ok:false,reason:"TARGET_NOT_FOUND"};
  if (!guest) return {ok:false,reason:"GUEST_NOT_FOUND"};
  if (guest.password || guest.accounts.length>0 || !donation ||
      donation.donorId!==guestUserId) {
    return {ok:false,reason:"GUEST_NOT_ELIGIBLE"};
  }

  // The atomic donorId compare-and-set prevents concurrent claims by different
  // OAuth accounts from both succeeding. Never move unrelated donations.
  return prisma.$transaction(async tx => {
    const moved=await tx.donation.updateMany({
      where: {
        donorId:guestUserId,
        ...(donation.subscriptionId
          ? {subscriptionId:donation.subscriptionId}
          : {id:donationId}),
      },
      data:{donorId:targetUserId},
    });
    if (moved.count<1) return {ok:false as const,reason:"GUEST_NOT_ELIGIBLE" as const};
    if (donation.subscriptionId) {
      const subscription=await tx.subscription.updateMany({
        where:{id:donation.subscriptionId,donorId:guestUserId},
        data:{donorId:targetUserId},
      });
      if (subscription.count!==1) {
        // Throw to roll back donation reassignment if subscription state drifted.
        throw new Error("Guest subscription ownership changed");
      }
    }
    return {ok:true as const,movedDonations:moved.count};
  },{timeout:15000});
}
