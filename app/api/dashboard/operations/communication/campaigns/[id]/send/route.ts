import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { executeCampaignSend } from "@/lib/communication/campaign-send-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send Now. Requires an APPROVED campaign and an explicit { confirm: true }. Executes one safe
 * batch through the ProviderRouter — deliveries are archived first, nothing is marked SENT unless
 * the provider accepted, and missing config → SKIPPED (never a fake sent).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.confirm !== true) {
    return NextResponse.json({ error: "confirmation required" }, { status: 400, headers: operationsNoStoreHeaders });
  }
  const summary = await executeCampaignSend(id, { actor: auditActorFromDashboardSession(session!), mode: "SEND_NOW" });
  if (summary.blocked) {
    return NextResponse.json({ error: summary.blocked, summary }, { status: 409, headers: operationsNoStoreHeaders });
  }
  return NextResponse.json({ summary }, { headers: operationsNoStoreHeaders });
}
