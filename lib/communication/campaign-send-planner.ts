import { getCampaign } from "./campaign-service";
import { loadCampaignRecipients, type CampaignRecipient } from "./campaign-recipient-service";
import { evaluateCoverageGate } from "./campaign-approval-service";
import { listSenders } from "./sender-service";
import { isSendEnabled } from "./provider-router";
import { isCommunicationChannel, type CommunicationChannelId } from "./communication-runtime-types";

/**
 * Dry-run send planner. Computes exactly what a send would do — recipient counts, eligibility,
 * language coverage, sender + provider readiness, and a single `blocked` reason / `willSend` flag —
 * WITHOUT any provider call and WITHOUT creating any delivery. Used by the review step and by the
 * executor as the shared pre-send gate so both agree on when a send is allowed.
 *
 * Blocked reasons (precedence order):
 *   NOT_FOUND · NO_TEMPLATE · INVALID_CHANNEL · LANGUAGE_COVERAGE_INCOMPLETE ·
 *   NO_ELIGIBLE_RECIPIENTS · PROVIDER_NOT_CONFIGURED · SMS_SEND_NOT_IMPLEMENTED · NO_SENDER_AVAILABLE
 */

export type SendPlan = {
  campaignId: string;
  channel: string | null;
  status: string | null;
  total: number;
  eligible: number;
  skipped: number;
  reasons: Record<string, number>;
  coverage: { ok: boolean; undecided: string[] };
  providerReady: boolean;
  senderReady: boolean;
  willSend: boolean;
  blocked?: string;
  truncated: boolean;
  // For the executor (the UI ignores these):
  recipients: CampaignRecipient[];
  skippedList: { userId: string; locale: string; reason: string }[];
};

export async function planCampaignSend(campaignId: string, opts: { batchSize?: number } = {}): Promise<SendPlan> {
  const batchSize = Math.min(opts.batchSize ?? 200, 1000);
  const empty: SendPlan = {
    campaignId, channel: null, status: null, total: 0, eligible: 0, skipped: 0, reasons: {},
    coverage: { ok: false, undecided: [] }, providerReady: false, senderReady: false, willSend: false,
    truncated: false, recipients: [], skippedList: [],
  };

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ...empty, blocked: "NOT_FOUND" };
  empty.status = campaign.status;
  empty.channel = campaign.channel;

  if (!campaign.templateGroupId) return { ...empty, blocked: "NO_TEMPLATE" };
  if (!isCommunicationChannel(campaign.channel)) return { ...empty, blocked: "INVALID_CHANNEL" };
  const channel: CommunicationChannelId = campaign.channel;

  const gate = await evaluateCoverageGate(campaignId);
  const coverage = { ok: gate.ok, undecided: gate.undecided };
  if (!gate.ok) return { ...empty, coverage, blocked: "LANGUAGE_COVERAGE_INCOMPLETE" };

  const { recipients, skipped, truncated } = await loadCampaignRecipients(channel, campaign.audienceSegmentKey, { limit: batchSize });
  const reasons: Record<string, number> = {};
  for (const s of skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;

  const partial: SendPlan = {
    ...empty, channel, coverage, truncated,
    total: recipients.length + skipped.length, eligible: recipients.length, skipped: skipped.length,
    reasons, recipients, skippedList: skipped,
  };

  if (recipients.length === 0) return { ...partial, blocked: "NO_ELIGIBLE_RECIPIENTS" };

  // Provider readiness.
  if (channel === "SMS") return { ...partial, providerReady: false, blocked: "SMS_SEND_NOT_IMPLEMENTED" };
  const providerReady = isSendEnabled(channel);
  if (!providerReady) return { ...partial, providerReady: false, blocked: "PROVIDER_NOT_CONFIGURED" };

  // Sender readiness.
  const senders = await listSenders();
  const senderReady =
    channel === "EMAIL"
      ? !!(senders.find((s) => s.channel === "EMAIL" && s.enabled)?.senderEmail || process.env.SENDGRID_FROM)
      : senders.some((s) => s.channel === channel && s.enabled && s.status === "ACTIVE" && !!s.phoneNumberId);
  if (!senderReady) return { ...partial, providerReady, senderReady: false, blocked: "NO_SENDER_AVAILABLE" };

  return { ...partial, providerReady, senderReady: true, willSend: true };
}
