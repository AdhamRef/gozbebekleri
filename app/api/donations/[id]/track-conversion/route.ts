/**
 * POST /api/donations/[id]/track-conversion
 *
 * Server leg of the Meta Donate conversion. Called once from the /success page
 * the first time a donor lands on it for a PAID donation. Responsibilities:
 *
 *   1. Verify the donation is genuinely PAID in our DB (don't trust the URL).
 *      No donation row → 404. Wrong status → `{ allowed: false, reason }`.
 *   2. Atomically claim `conversionEventsSentAt` so concurrent calls (multi-
 *      tab refresh, link forwarded to another browser) can't both fire CAPI.
 *   3. On a winning claim, fire Meta CAPI "Donate" + GA4 MP "purchase" via the
 *      shared `sendDonationServerConversions` sender.
 *   4. Return `{ allowed, alreadyFired, eventId }` so the browser knows
 *      whether to also fire fbq with the same event_id. Meta dedupes the
 *      browser↔server pair into one conversion.
 *
 * Why a dedicated endpoint instead of /api/track:
 *   • /api/track is a generic mirror — no DB lookup, no atomic claim, no
 *     status check. Donate needs all three.
 *   • Keeping Donate out of /api/track lets us mark `donation_complete` in
 *     META_CAPI_OFF_CHANNEL so the generic mirror can never accidentally
 *     duplicate this endpoint's send.
 *
 * Idempotency model:
 *   • `conversionEventsSentAt` (DB) is the authoritative gate. Per-browser
 *     localStorage on the success page is a fast-path that avoids the API
 *     round trip on refresh.
 *   • Same `event_id` (`donate_<donationId>`) used by browser fbq + this
 *     server CAPI fire → Meta dedupes anything that does sneak through.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDonationServerConversions } from "@/lib/tracking/donation-conversion-server";
import { metaDonationEventId } from "@/lib/tracking/canonical";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ allowed: false, reason: "missing donation id" }, { status: 400 });
  }

  const row = await prisma.donation.findUnique({
    where: { id },
    select: { id: true, status: true, paidAt: true, conversionEventsSentAt: true },
  });
  if (!row) {
    return NextResponse.json({ allowed: false, reason: "not found" }, { status: 404 });
  }

  // Refuse anything that isn't a confirmed paid donation. The success page
  // shouldn't ever land here for a non-PAID row (it gates on donation.status
  // before calling), but defence-in-depth: Meta must only see Donate for
  // genuinely paid conversions or we contaminate the ad account.
  if (row.status !== "PAID" || row.paidAt == null) {
    return NextResponse.json(
      { allowed: false, reason: `not paid (status=${row.status})` },
      { status: 200 }
    );
  }

  const eventId = metaDonationEventId(row.id, "success");

  // Fast path: claim already taken → tell the browser to skip its fbq fire.
  // (We could still let the browser fire and rely on Meta's 48h event_id
  // dedup window, but for visits past that window the browser fire would
  // count as a duplicate. Suppressing it here is the safe call.)
  if (row.conversionEventsSentAt != null) {
    return NextResponse.json(
      { allowed: false, alreadyFired: true, eventId },
      { status: 200 }
    );
  }

  // Slow path: actually fire. The sender atomically claims the row before
  // POSTing to Graph; if a concurrent caller beat us to the claim, the
  // sender returns `skipped: true, reason: "lost idempotency claim"` and
  // we surface that to the browser as `alreadyFired`.
  const result = await sendDonationServerConversions(row.id);

  if (result.skipped && result.reason === "lost idempotency claim") {
    return NextResponse.json(
      { allowed: false, alreadyFired: true, eventId },
      { status: 200 }
    );
  }

  // Whether the Graph POST succeeded or hit a transient network blip, the
  // claim has been stamped — this is the only browser allowed to fire fbq
  // for this donation. Returning `allowed: true` is correct regardless of
  // `result.ok`: the browser fire is a redundancy that helps when CAPI
  // failed; Meta dedupes on event_id either way.
  return NextResponse.json(
    {
      allowed: true,
      alreadyFired: false,
      eventId,
      meta: { ok: result.ok, skipped: result.skipped ?? false, reason: result.reason },
    },
    { status: 200 }
  );
}
