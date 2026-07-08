import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { duplicateCampaign } from "@/lib/communication/campaign-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Duplicate a campaign into a fresh DRAFT (config copied; schedule/status/results/logs NOT copied). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await duplicateCampaign(id, { name: typeof body.name === "string" ? body.name : null, actor: auditActorFromDashboardSession(session!) });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ campaign: result.data }, { headers: operationsNoStoreHeaders });
}
