import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import type { CommunicationCampaign } from "@prisma/client";
import { getCampaign } from "./campaign-service";
import { planCampaignSend, type SendPlan } from "./campaign-send-planner";
import { renderChannelTemplate } from "./template-compat";
import { createDeliveryRecord, recordSkippedDelivery, markDeliveryStatus } from "./delivery-log-service";
import { sendPreparedDelivery } from "./provider-router";
import { listSenders, toSenderConfig } from "./sender-service";
import { listRoutingRules, toRoutingRuleConfig } from "./routing-rule-service";
import { resolveSender } from "./sender-router";
import { type CommunicationChannelId, type CommunicationPurposeId } from "./communication-runtime-types";

/**
 * Campaign send executor. Turns an APPROVED (Send Now) or due SCHEDULED campaign into real,
 * archived deliveries. Every recipient gets a CommunicationDelivery BEFORE any provider call;
 * nothing is marked SENT unless the provider accepted.
 *
 * SAFETY:
 * - All pre-send gates (planCampaignSend) must pass BEFORE the campaign is moved to SENDING.
 *   If blocked (no template, coverage incomplete, no eligible recipients, provider/sender not
 *   ready, …) the campaign is NOT moved to SENDING and a `communication.campaign.send.blocked`
 *   audit is written.
 * - Final status can never be SENT with 0 sent (see `computeFinalStatus`). Allowed CommunicationCampaign
 *   status values (String): DRAFT · REVIEW · APPROVED · SCHEDULED · SENDING · SENT · SENT_WITH_ISSUES ·
 *   BLOCKED · CANCELLED · FAILED.
 * - Idempotent per (campaign + template + channel + origin=CAMPAIGN + recipient); a recipient with an
 *   existing processed delivery (or a providerMessageId) is never sent again.
 */

type Actor = { actorId?: string | null; actorName?: string | null; actorRole?: string | null } | null;

export type SendMode = "SEND_NOW" | "DUE";

export type ExecutionSummary = {
  ok: boolean;
  campaignId: string;
  status: string;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  truncated: boolean;
  reasons: Record<string, number>;
  blocked?: string;
};

const PROCESSED_STATUSES = ["RENDERED", "QUEUED", "SENT_TO_PROVIDER", "SENT", "DELIVERED", "READ", "FAILED", "SKIPPED"];

function bump(reasons: Record<string, number>, key: string) {
  reasons[key] = (reasons[key] ?? 0) + 1;
}

function coverageDecisions(campaign: CommunicationCampaign): Record<string, string> {
  return ((campaign.metadata as Record<string, unknown> | null)?.coverageDecisions ?? {}) as Record<string, string>;
}

/**
 * Safe final campaign status. NEVER returns SENT unless at least one message was actually sent with
 * nothing skipped/failed.
 */
export function computeFinalStatus(total: number, sent: number, skipped: number, failed: number): string {
  if (total === 0) return "BLOCKED";
  if (sent > 0 && failed === 0 && skipped === 0) return "SENT";
  if (sent > 0) return "SENT_WITH_ISSUES";
  if (failed > 0) return "FAILED";
  if (skipped > 0) return "BLOCKED";
  return "BLOCKED";
}

async function auditBlocked(campaign: CommunicationCampaign, reason: string, actor: Actor, mode: SendMode, plan?: SendPlan) {
  await writeAuditLog({
    actorId: actor?.actorId ?? undefined,
    actorName: actor?.actorName ?? undefined,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "communication.campaign.send.blocked",
    messageAr: `تعذّر إرسال حملة «${campaign.name}» — السبب: ${reason}`,
    messageEn: `Campaign send blocked: ${campaign.name} — ${reason}`,
    entityType: "CommunicationCampaign",
    entityId: campaign.id,
    metadata: { mode, reason, summary: plan ? { total: plan.total, eligible: plan.eligible, skipped: plan.skipped, reasons: plan.reasons } : undefined, externalCall: false, autoSend: false },
    stream: "TEAM",
  });
}

/** Merge lastRun into campaign metadata without clobbering other keys (e.g. coverageDecisions). */
function mergedMetadata(campaign: CommunicationCampaign, lastRun: Record<string, unknown>) {
  return { ...(campaign.metadata as Record<string, unknown> | null), lastRun } as never;
}

export async function executeCampaignSend(
  campaignId: string,
  opts: { actor?: Actor; mode?: SendMode; batchSize?: number } = {}
): Promise<ExecutionSummary> {
  const mode = opts.mode ?? "SEND_NOW";
  const batchSize = Math.min(opts.batchSize ?? 200, 1000);
  const actor = opts.actor ?? null;
  const base: ExecutionSummary = { ok: false, campaignId, status: "", total: 0, sent: 0, skipped: 0, failed: 0, truncated: false, reasons: {} };

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ...base, blocked: "NOT_FOUND" };
  base.status = campaign.status;

  // Status/mode gate (before any content gate).
  if (mode === "SEND_NOW" && campaign.status !== "APPROVED") {
    await auditBlocked(campaign, "NOT_APPROVED", actor, mode);
    return { ...base, blocked: "NOT_APPROVED" };
  }
  if (mode === "DUE") {
    if (campaign.status !== "SCHEDULED") {
      await auditBlocked(campaign, "NOT_SCHEDULED", actor, mode);
      return { ...base, blocked: "NOT_SCHEDULED" };
    }
    if (!campaign.scheduledAt || campaign.scheduledAt.getTime() > Date.now()) {
      await auditBlocked(campaign, "NOT_DUE", actor, mode);
      return { ...base, blocked: "NOT_DUE" };
    }
  }

  // Content/readiness gates — must ALL pass before we move to SENDING.
  const plan = await planCampaignSend(campaignId, { batchSize });
  base.total = plan.total;
  base.truncated = plan.truncated;
  base.reasons = { ...plan.reasons };
  if (plan.blocked) {
    await auditBlocked(campaign, plan.blocked, actor, mode, plan);
    // Record the blocked run in metadata without changing status away from APPROVED/SCHEDULED.
    await prisma.communicationCampaign
      .update({ where: { id: campaignId }, data: { metadata: mergedMetadata(campaign, { ranAt: new Date().toISOString(), mode, total: plan.total, sent: 0, skipped: plan.skipped, failed: 0, blocked: plan.blocked, reasons: plan.reasons, truncated: plan.truncated }) } })
      .catch(() => {});
    return { ...base, blocked: plan.blocked };
  }

  const channel: CommunicationChannelId = campaign.channel as CommunicationChannelId;
  const templateId = campaign.templateGroupId as string; // guaranteed by the NO_TEMPLATE gate above
  const decisions = coverageDecisions(campaign);
  const purpose = campaign.purpose as CommunicationPurposeId;

  // All gates passed → NOW move to SENDING.
  await prisma.communicationCampaign.update({ where: { id: campaignId }, data: { status: "SENDING" } }).catch(() => {});

  // Load senders/rules for routing (WhatsApp/SMS). Email uses its own identity.
  const senders = await listSenders();
  const rules = await listRoutingRules(channel);
  const senderConfigs = senders.filter((s) => s.channel === channel).map(toSenderConfig);
  const ruleConfigs = rules.map(toRoutingRuleConfig);
  const rawSenderById = new Map(senders.map((s) => [s.id, s]));
  const defaultEmailIdentity =
    senders.find((s) => s.channel === "EMAIL" && s.enabled)?.senderEmail || process.env.SENDGRID_FROM || null;

  // Idempotency: recipients already processed for this campaign+template+channel+origin CAMPAIGN,
  // or any recipient with a providerMessageId already assigned.
  const existing = await prisma.communicationDelivery
    .findMany({ where: { campaignId, templateId: templateId, channel, origin: "CAMPAIGN" }, select: { recipientUserId: true, status: true, providerMessageId: true } })
    .catch(() => []);
  const alreadyDone = new Set(
    existing
      .filter((d) => (d.status && PROCESSED_STATUSES.includes(d.status)) || !!d.providerMessageId)
      .map((d) => d.recipientUserId)
      .filter(Boolean) as string[]
  );

  const recipients = plan.recipients;
  const skipped = plan.skippedList;

  // Archive ineligible recipients as SKIPPED (bounded, idempotent).
  for (const s of skipped.slice(0, batchSize)) {
    if (alreadyDone.has(s.userId)) continue;
    await recordSkippedDelivery(
      { channel, campaignId, templateId: templateId, recipientUserId: s.userId, locale: s.locale, purpose, origin: "CAMPAIGN", createdBy: actor?.actorId ?? null },
      s.reason
    );
    base.skipped += 1;
    bump(base.reasons, s.reason);
  }

  for (const r of recipients) {
    if (alreadyDone.has(r.userId)) {
      bump(base.reasons, "ALREADY_PROCESSED");
      continue;
    }

    // Coverage decision: excluded language → skip.
    const rendered = await renderChannelTemplate(channel, templateId, r.locale);
    if (!rendered) {
      await recordSkippedDelivery({ channel, campaignId, templateId: templateId, recipientUserId: r.userId, locale: r.locale, purpose, origin: "CAMPAIGN" }, "TEMPLATE_RENDER_FAILED");
      base.skipped += 1;
      bump(base.reasons, "TEMPLATE_RENDER_FAILED");
      continue;
    }
    if (rendered.usedFallback && decisions[r.locale] === "EXCLUDE") {
      await recordSkippedDelivery({ channel, campaignId, templateId: templateId, recipientUserId: r.userId, locale: r.locale, purpose, origin: "CAMPAIGN", templateName: rendered.templateName }, "LANGUAGE_EXCLUDED");
      base.skipped += 1;
      bump(base.reasons, "LANGUAGE_EXCLUDED");
      continue;
    }

    // Resolve sender (WhatsApp/SMS). Email uses the default identity.
    let routerSender: { id?: string; provider?: string | null; phoneNumberId?: string | null; senderEmail?: string | null; smsSender?: string | null } | null = null;
    if (channel === "EMAIL") {
      routerSender = defaultEmailIdentity ? { senderEmail: defaultEmailIdentity } : null;
    } else {
      const routed = resolveSender({ channel, locale: r.locale, country: r.country, purpose: purpose === "MARKETING" ? "MARKETING" : "TRANSACTIONAL" }, senderConfigs, ruleConfigs);
      if ("sender" in routed) {
        const raw = rawSenderById.get(routed.sender.id);
        routerSender = raw ? { id: raw.id, provider: raw.provider, phoneNumberId: raw.phoneNumberId, smsSender: raw.smsSender } : null;
      }
    }

    // Create the delivery record BEFORE sending.
    const created = await createDeliveryRecord({
      channel,
      campaignId,
      templateId: templateId,
      templateName: rendered.templateName,
      recipientUserId: r.userId,
      recipientEmail: channel === "EMAIL" ? r.email : null,
      recipientPhone: channel !== "EMAIL" ? r.phone : null,
      recipientName: r.name,
      locale: r.locale,
      purpose,
      origin: "CAMPAIGN",
      renderedSubject: rendered.subject,
      renderedBody: rendered.body,
      senderId: routerSender?.id ?? null,
      createdBy: actor?.actorId ?? null,
      status: "RENDERED",
    });
    if (!created.ok) {
      base.failed += 1;
      bump(base.reasons, "ARCHIVE_FAILED");
      continue;
    }
    const deliveryId = created.data.id;

    if (!routerSender) {
      await markDeliveryStatus(deliveryId, "SKIPPED", { errorMessage: "NO_SENDER_AVAILABLE" });
      base.skipped += 1;
      bump(base.reasons, "NO_SENDER_AVAILABLE");
      continue;
    }

    // Send through the provider router.
    const to = channel === "EMAIL" ? r.email ?? "" : r.phone ?? "";
    const result = await sendPreparedDelivery({
      channel,
      sender: routerSender,
      country: r.country,
      to,
      templateName: rendered.templateName,
      languageCode: r.locale,
      subject: rendered.subject,
      html: rendered.body,
    });

    if (!result.ok) {
      const terminal = result.reason.endsWith("_NOT_CONFIGURED") || result.reason.endsWith("_NOT_IMPLEMENTED") || result.reason.includes("SENDER_MISSING");
      await markDeliveryStatus(deliveryId, terminal ? "SKIPPED" : "FAILED", { errorMessage: result.reason });
      if (terminal) base.skipped += 1;
      else base.failed += 1;
      bump(base.reasons, result.reason);
      continue;
    }

    await markDeliveryStatus(deliveryId, "SENT", { providerMessageId: result.providerMessageId, internalAccepted: result.internalAccepted });
    base.sent += 1;
    bump(base.reasons, "SENT");
  }

  // Finalize campaign status + counters. NEVER SENT with 0 sent.
  const finalStatus = computeFinalStatus(base.total, base.sent, base.skipped, base.failed);
  await prisma.communicationCampaign
    .update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentCount: { increment: base.sent },
        failedCount: { increment: base.failed },
        metadata: mergedMetadata(campaign, { ranAt: new Date().toISOString(), mode, total: base.total, sent: base.sent, skipped: base.skipped, failed: base.failed, blocked: null, reasons: base.reasons, truncated: base.truncated }),
      },
    })
    .catch(() => {});

  await writeAuditLog({
    actorId: actor?.actorId ?? undefined,
    actorName: actor?.actorName ?? undefined,
    actorRole: actor?.actorRole ?? "ADMIN",
    action: "communication.campaign.send",
    messageAr: `تنفيذ إرسال حملة «${campaign.name}» — أُرسل ${base.sent}، تخطّي ${base.skipped}، فشل ${base.failed}`,
    messageEn: `Campaign send executed: ${campaign.name} — sent ${base.sent}, skipped ${base.skipped}, failed ${base.failed}`,
    entityType: "CommunicationCampaign",
    entityId: campaignId,
    metadata: { mode, sent: base.sent, skipped: base.skipped, failed: base.failed, truncated: base.truncated, externalCall: base.sent > 0 },
    stream: "TEAM",
  });

  base.ok = true;
  base.status = finalStatus;
  return base;
}

/** Execute all due scheduled campaigns (admin/cron). Returns per-campaign summaries. */
export async function runDueCampaigns(opts: { actor?: Actor; max?: number } = {}): Promise<ExecutionSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const due = await prisma.communicationCampaign
    .findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } }, select: { id: true }, take: Math.min(opts.max ?? 10, 50) })
    .catch(() => []);
  const results: ExecutionSummary[] = [];
  for (const c of due) {
    results.push(await executeCampaignSend(c.id, { actor: opts.actor, mode: "DUE" }));
  }
  return results;
}
