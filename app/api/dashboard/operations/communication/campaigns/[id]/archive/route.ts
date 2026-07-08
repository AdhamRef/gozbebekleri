import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { archiveCampaign } from "@/lib/communication/campaign-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Archive a finished campaign (SENT/…/CANCELLED). Delivery logs are preserved. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const result = await archiveCampaign(id, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ campaign: result.data }, { headers: operationsNoStoreHeaders });
}
