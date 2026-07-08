import { NextRequest, NextResponse } from "next/server";
import { operationsNoStoreHeaders, requireOperationsApiSession } from "../../../_auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getCampaign, updateCampaign, deleteDraftCampaign } from "@/lib/communication/campaign-service";
import { getCampaignDonationReport } from "@/lib/communication/campaign-attribution-service";
import { getRecipientBreakdown } from "@/lib/communication/campaign-recipient-service";
import { getTemplateAvailableLocales, listChannelTemplates } from "@/lib/communication/template-compat";
import { computeLanguageCoverage } from "@/lib/communication/language-coverage";
import { listSenders } from "@/lib/communication/sender-service";
import { evaluateCoverageGate, submitForReview, approveCampaign, transitionCampaignSafe } from "@/lib/communication/campaign-approval-service";
import { isCommunicationChannel } from "@/lib/communication/communication-runtime-types";
import { isSendEnabled } from "@/lib/communication/provider-router";
import { planCampaignSend } from "@/lib/communication/campaign-send-planner";
import { isSchedulerConfigured } from "@/lib/communication/scheduler-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "not found" }, { status: 404, headers: operationsNoStoreHeaders });

  const channel = isCommunicationChannel(campaign.channel) ? campaign.channel : null;
  const [breakdown, templates, senders] = await Promise.all([
    channel ? getRecipientBreakdown(channel, { locale: campaign.audienceSegmentKey }) : Promise.resolve(null),
    channel ? listChannelTemplates(channel) : Promise.resolve([]),
    channel ? listSenders().then((all) => all.filter((s) => s.channel === channel)) : Promise.resolve([]),
  ]);

  let coverage = null;
  let coverageGate = null;
  if (channel && campaign.templateGroupId && breakdown) {
    const available = await getTemplateAvailableLocales(channel, campaign.templateGroupId);
    coverage = computeLanguageCoverage(breakdown.recipientLocaleCounts, available);
    coverageGate = await evaluateCoverageGate(id);
  }

  // Dry-run plan for the review step (no send, no delivery created). Omit the heavy recipient list.
  const plan = await planCampaignSend(id);
  const planSummary = { total: plan.total, eligible: plan.eligible, skipped: plan.skipped, reasons: plan.reasons, providerReady: plan.providerReady, senderReady: plan.senderReady, willSend: plan.willSend, blocked: plan.blocked ?? null };

  // Tracking links + real donation attribution (short-circuits cheaply when no links are attached).
  const trackingReport = await getCampaignDonationReport({ id: campaign.id, channel: campaign.channel }).catch(() => null);

  return NextResponse.json(
    { campaign, breakdown, templates, senders, coverage, coverageGate, plan: planSummary, sendEnabled: channel ? isSendEnabled(channel) : false, schedulerConfigured: isSchedulerConfigured(), trackingReport },
    { headers: operationsNoStoreHeaders }
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const actor = auditActorFromDashboardSession(session!);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "update";

  if (action === "submit_review") {
    const r = await submitForReview(id, actor);
    return r.ok ? NextResponse.json({ ok: true }, { headers: operationsNoStoreHeaders }) : NextResponse.json({ error: r.error }, { status: r.status, headers: operationsNoStoreHeaders });
  }
  if (action === "approve") {
    const r = await approveCampaign(id, actor);
    return r.ok ? NextResponse.json({ ok: true }, { headers: operationsNoStoreHeaders }) : NextResponse.json({ error: r.error, undecided: r.undecided }, { status: r.status, headers: operationsNoStoreHeaders });
  }
  if (action === "schedule" || action === "cancel") {
    const scheduledAt = action === "schedule" && typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;
    const r = await transitionCampaignSafe(id, action === "schedule" ? "SCHEDULE" : "CANCEL", actor, scheduledAt);
    return r.ok ? NextResponse.json({ ok: true }, { headers: operationsNoStoreHeaders }) : NextResponse.json({ error: r.error }, { status: r.status, headers: operationsNoStoreHeaders });
  }

  // Default: update configuration.
  const { action: _a, ...patch } = body;
  void _a;
  const result = await updateCampaign(id, patch, actor);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json({ campaign: result.data }, { headers: operationsNoStoreHeaders });
}

/** Delete a DRAFT campaign. Hard-deletes only when there are no deliveries; otherwise archives (logs kept). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireOperationsApiSession();
  if (denied) return denied;
  const { id } = await params;
  const result = await deleteDraftCampaign(id, auditActorFromDashboardSession(session!));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: operationsNoStoreHeaders });
  return NextResponse.json(result.data, { headers: operationsNoStoreHeaders });
}
