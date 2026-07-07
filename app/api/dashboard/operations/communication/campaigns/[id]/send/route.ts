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
    // Clear, specific block reason (NOT_APPROVED / NO_TEMPLATE / LANGUAGE_COVERAGE_INCOMPLETE /
    // NO_ELIGIBLE_RECIPIENTS / PROVIDER_NOT_CONFIGURED / NO_SENDER_AVAILABLE / SMS_SEND_NOT_IMPLEMENTED / …).
    const status = summary.blocked === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: summary.blocked, reason: summary.blocked, blocked: true, summary }, { status, headers: operationsNoStoreHeaders });
  }
  return NextResponse.json({ summary }, { headers: operationsNoStoreHeaders });
}
