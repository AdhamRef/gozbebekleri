import { NextRequest, NextResponse } from "next/server";
import { runDueCampaigns } from "@/lib/communication/campaign-send-executor";
import { writeAuditLog } from "@/lib/audit-log";
import { SCHEDULER_RUN_ACTION } from "@/lib/communication/scheduler-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron entry that executes due scheduled communication campaigns.
 * Configure: add to vercel.json crons + set `CRON_SECRET` in the project env. Vercel Cron sends
 *   Authorization: Bearer $CRON_SECRET
 * automatically. This route is FAIL-CLOSED: with no CRON_SECRET set it rejects everything, so the
 * send path can never be triggered by an unauthenticated public call.
 *
 * Manual/admin runs use the separate operations-guarded route
 *   POST /api/dashboard/operations/communication/campaigns/run-due
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  // Fail-closed: no secret configured OR mismatch → reject. Never a public send endpoint.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDueCampaigns({ actor: { actorRole: "SYSTEM" }, max: 20 });
    const totals = results.reduce(
      (acc, r) => ({ sent: acc.sent + r.sent, skipped: acc.skipped + r.skipped, failed: acc.failed + r.failed }),
      { sent: 0, skipped: 0, failed: 0 }
    );
    // Heartbeat marker so the dashboard can show "last run".
    await writeAuditLog({
      actorRole: "SYSTEM",
      action: SCHEDULER_RUN_ACTION,
      messageAr: `تشغيل جدولة التواصل — ${results.length} حملة مستحقة`,
      messageEn: `Communication scheduler run — ${results.length} due campaign(s)`,
      entityType: "CommunicationScheduler",
      metadata: { ran: results.length, ...totals, externalCall: totals.sent > 0 },
      stream: "TEAM",
    });
    return NextResponse.json({ ok: true, ran: results.length, ...totals });
  } catch (e) {
    console.error("[cron/communication-run-due]", e);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500 });
  }
}
