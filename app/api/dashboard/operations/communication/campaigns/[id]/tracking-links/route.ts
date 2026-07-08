import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getCampaign } from "@/lib/communication/campaign-service";
import { listTrackingLinks, attachTrackingLink } from "@/lib/communication/campaign-attribution-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const links = await listTrackingLinks(id);
  return NextResponse.json({ links }, { headers: operationsNoStoreHeaders });
}

/**
 * Attach a tracking link. Body: `{ baseUrl?, existingUrl?, linkId?, locale?, templateId?, createInGenerator? }`.
 * Source is auto-selected from the campaign channel; medium = communication; utm_campaign = campaign id.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "not found" }, { status: 404, headers: operationsNoStoreHeaders });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await attachTrackingLink(
    { id: campaign.id, channel: campaign.channel },
    {
      baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : null,
      existingUrl: typeof body.existingUrl === "string" ? body.existingUrl : null,
      linkId: typeof body.linkId === "string" ? body.linkId : null,
      locale: typeof body.locale === "string" ? body.locale : null,
      templateId: typeof body.templateId === "string" ? body.templateId : null,
      createInGenerator: body.createInGenerator === true,
    },
    auditActorFromDashboardSession(session!)
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ link: result.data }, { headers: operationsNoStoreHeaders });
}
