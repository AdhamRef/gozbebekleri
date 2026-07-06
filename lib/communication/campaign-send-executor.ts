import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import type { CommunicationCampaign } from "@prisma/client";
import { getCampaign } from "./campaign-service";
import { loadCampaignRecipients } from "./campaign-recipient-service";
import { evaluateCoverageGate } from "./campaign-approval-service";
import { renderChannelTemplate } from "./template-compat";
import { createDeliveryRecord, recordSkippedDelivery, markDeliveryStatus } from "./delivery-log-service";
import { sendPreparedDelivery } from "./provider-router";
import { listSenders, toSenderConfig } from "./sender-service";
import { listRoutingRules, toRoutingRuleConfig } from "./routing-rule-service";
import { resolveSender } from "./sender-router";
import { isCommunicationChannel, type CommunicationChannelId, type CommunicationPurposeId } from "./communication-runtime-types";

/**
 * Campaign send executor. Turns an APPROVED (Send Now) or due SCHEDULED campaign into real,
 * archived deliveries. Every recipient gets a CommunicationDelivery BEFORE any provider call;
 * nothing is marked SENT unless the provider accepted. Missing config / ineligible / no-sender →
 * SKIPPED with a reason. Idempotent per (campaign + recipient + template). Batched and audited.
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

function bump(reasons: Record<string, number>, key: string) {
  reasons[key] = (reasons[key] ?? 0) + 1;
}

function coverageDecisions(campaign: CommunicationCampaign): Record<string, string> {
  return ((campaign.metadata as Record<string, unknown> | null)?.coverageDecisions ?? {}) as Record<string, string>;
}

export async function executeCampaignSend(
  campaignId: string,
  opts: { actor?: Actor; mode?: SendMode; batchSize?: number } = {}
): Promise<ExecutionSummary> {
  const mode = opts.mode ?? "SEND_NOW";
  const batchSize = Math.min(opts.batchSize ?? 200, 1000);
  const base: ExecutionSummary = { ok: false, campaignId, status: "", total: 0, sent: 0, skipped: 0, failed: 0, truncated: false, reasons: {} };

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ...base, blocked: "NOT_FOUND" };
  base.status = campaign.status;

  // Status gate.
  if (mode === "SEND_NOW" && campaign.status !== "APPROVED") return { ...base, blocked: "NOT_APPROVED" };
  if (mode === "DUE") {
    if (campaign.status !== "SCHEDULED") return { ...base, blocked: "NOT_SCHEDULED" };
    if (!campaign.scheduledAt || campaign.scheduledAt.getTime() > Date.now()) return { ...base, blocked: "NOT_DUE" };
  }
  if (!isCommunicationChannel(campaign.channel)) return { ...base, blocked: "INVALID_CHANNEL" };
  if (!campaign.templateGroupId) return { ...base, blocked: "NO_TEMPLATE" };
  const channel: CommunicationChannelId = campaign.channel;

  // Language coverage gate — never silently send the wrong language.
  const gate = await evaluateCoverageGate(campaignId);
  if (!gate.ok) return { ...base, blocked: "LANGUAGE_COVERAGE_INCOMPLETE" };

  // Move to SENDING.
  await prisma.communicationCampaign.update({ where: { id: campaignId }, data: { status: "SENDING" } }).catch(() => {});

  const decisions = coverageDecisions(campaign);
  const purpose = campaign.purpose as CommunicationPurposeId;

  // Load senders/rules once for routing (WhatsApp/SMS). Email uses its own identity.
  const senders = await listSenders();
  const rules = await listRoutingRules(channel);
  const senderConfigs = senders.filter((s) => s.channel === channel).map(toSenderConfig);
  const ruleConfigs = rules.map(toRoutingRuleConfig);
  const rawSenderById = new Map(senders.map((s) => [s.id, s]));
  const defaultEmailIdentity =
    senders.find((s) => s.channel === "EMAIL" && s.enabled)?.senderEmail || process.env.SENDGRID_FROM || null;

  // Idempotency: recipients already archived for this campaign+template.
  const existing = await prisma.communicationDelivery
    .findMany({ where: { campaignId, templateId: campaign.templateGroupId }, select: { recipientUserId: true } })
    .catch(() => []);
  const alreadyDone = new Set(existing.map((d) => d.recipientUserId).filter(Boolean) as string[]);

  const { recipients, skipped, truncated } = await loadCampaignRecipients(channel, campaign.audienceSegmentKey, { limit: batchSize });
  base.total = recipients.length + skipped.length;
  base.truncated = truncated;

  // Archive ineligible recipients as SKIPPED (bounded).
  for (const s of skipped.slice(0, batchSize)) {
    if (alreadyDone.has(s.userId)) continue;
    await recordSkippedDelivery(
      { channel, campaignId, templateId: campaign.templateGroupId, recipientUserId: s.userId, locale: s.locale, purpose, origin: "CAMPAIGN", createdBy: opts.actor?.actorId ?? null },
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
    const rendered = await renderChannelTemplate(channel, campaign.templateGroupId, r.locale);
    if (!rendered) {
      await recordSkippedDelivery({ channel, campaignId, templateId: campaign.templateGroupId, recipientUserId: r.userId, locale: r.locale, purpose, origin: "CAMPAIGN" }, "TEMPLATE_RENDER_FAILED");
      base.skipped += 1;
      bump(base.reasons, "TEMPLATE_RENDER_FAILED");
      continue;
    }
    if (rendered.usedFallback && decisions[r.locale] === "EXCLUDE") {
      await recordSkippedDelivery({ channel, campaignId, templateId: campaign.templateGroupId, recipientUserId: r.userId, locale: r.locale, purpose, origin: "CAMPAIGN", templateName: rendered.templateName }, "LANGUAGE_EXCLUDED");
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
      templateId: campaign.templateGroupId,
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
      createdBy: opts.actor?.actorId ?? null,
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

  // Finalize campaign status + counters.
  const finalStatus = base.failed > 0 && base.sent === 0 ? "FAILED" : "SENT";
  await prisma.communicationCampaign
    .update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentCount: { increment: base.sent },
        failedCount: { increment: base.failed },
        metadata: { ...(campaign.metadata as Record<string, unknown> | null), lastRun: { sent: base.sent, skipped: base.skipped, failed: base.failed, truncated: base.truncated } } as never,
      },
    })
    .catch(() => {});

  await writeAuditLog({
    actorId: opts.actor?.actorId ?? undefined,
    actorName: opts.actor?.actorName ?? undefined,
    actorRole: opts.actor?.actorRole ?? "ADMIN",
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
