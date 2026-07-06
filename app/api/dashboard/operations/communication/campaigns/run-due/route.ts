import { NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { runDueCampaigns } from "@/lib/communication/campaign-send-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Execute due scheduled campaigns. Admin/operations only. No cron infrastructure exists yet, so
 * this is called manually (or by a future scheduled job / external cron hitting this endpoint).
 * Each due campaign runs one safe batch through the same executor as Send Now.
 */
export async function POST() {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const results = await runDueCampaigns({ actor: auditActorFromDashboardSession(session!) });
  return NextResponse.json({ ran: results.length, results }, { headers: operationsNoStoreHeaders });
}
