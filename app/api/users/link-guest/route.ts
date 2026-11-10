import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { linkGuestUserToTarget } from "@/lib/users/link-guest";
import { hasGuestClaimGrant } from "@/lib/donations/guest-payment-grant";

/** Only the original guest browser with an unexpired scoped, signed claim
 * cookie may link that guest's donation after verified account sign-in.
 * Donation IDs are public identifiers and cannot authorize ownership changes.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = req.headers.get("origin");
    if (!origin || origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
    const body = (await req.json().catch(() => null)) as { donationId?: string } | null;
    const donationId = body?.donationId?.trim();
    if (!donationId || !/^[0-9a-f]{24}$/i.test(donationId)) {
      return NextResponse.json({ error: "Invalid donation" }, { status: 400 });
    }
    if (!hasGuestClaimGrant(req, donationId)) {
      return NextResponse.json({ error: "Claim authorization required" }, {
        status: 403, headers: { "Cache-Control": "no-store" },
      });
    }

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { donorId: true },
    });
    if (!donation) {
      return NextResponse.json({ error: "Donation unavailable" }, { status: 404 });
    }

    const result = await linkGuestUserToTarget(donation.donorId, session.user.id);
    if (!result.ok) {
      const status = result.reason === "GUEST_NOT_ELIGIBLE" ? 409 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      success: true,
      movedDonations: result.movedDonations,
      alreadyLinked: result.alreadyLinked ?? false,
    });
  } catch (error) {
    console.error("[link-guest]", error);
    return NextResponse.json({ error: "Failed to link guest donation" }, { status: 500 });
  }
}
