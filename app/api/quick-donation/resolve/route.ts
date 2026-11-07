import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOT_SOFT_DELETED, NOT_IMPACT_BACKING } from "@/lib/campaign/soft-delete-filter";
import {
  resolveInstitutionQuickDonationTarget,
  validateInstitutionQuickDonation,
} from "@/lib/quick-donation/institution-config";

/**
 * Public read-only destination resolution.
 * This does NOT add to cart or charge a card.
 * A future checkout caller must still check the target at its write boundary.
 */
export async function POST(request: NextRequest) {
  // Deliberately compile-time locked until checkout revalidates the selected
  // destination at its own financial write boundary. An environment variable
  // or manually inserted GlobalSettings row cannot turn this feature on.
  const checkoutIntegrationReleased: boolean = false;
  if (!checkoutIntegrationReleased) {
    return NextResponse.json({ error: "QUICK_DONATION_CHECKOUT_NOT_RELEASED" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let payload: unknown;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const input = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown> : null;
  if (!input || typeof input.destination !== "string" || input.destination.length > 128) {
    return NextResponse.json({ error: "INVALID_DESTINATION" }, { status: 400 });
  }
  try {
    const row = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" }, select: { quickDonation: true },
    });
    if (!row?.quickDonation) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 422 });
    const config = validateInstitutionQuickDonation(row.quickDonation);
    const projectId = resolveInstitutionQuickDonationTarget(config, input.destination);
    if (!projectId) return NextResponse.json({ error: "UNAPPROVED_DESTINATION" }, { status: 422 });
    const project = await prisma.campaign.findFirst({
      where: { id: projectId, isActive: true, AND: [NOT_SOFT_DELETED, NOT_IMPACT_BACKING] },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "DESTINATION_UNAVAILABLE" }, { status: 422 });
    return NextResponse.json({ projectId: project.id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "DESTINATION_CHECK_UNAVAILABLE" }, { status: 503 });
  }
}
