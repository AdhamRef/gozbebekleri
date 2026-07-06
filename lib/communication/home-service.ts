import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import { listConversations } from "./conversation-service";
import { listChannelTemplates } from "./template-compat";
import { isSendEnabled } from "./provider-router";

/**
 * Compact data for the Communication Center home (command center). Read-only, lightweight — the four
 * action counts, provider readiness, and recent campaigns. No provider calls, no secrets.
 */

export type CommunicationHome = {
  campaignsInReview: number;
  repliesNeedingAction: number;
  failedDeliveries: number;
  incompleteTemplates: number;
  providers: { whatsapp: boolean; email: boolean; sms: boolean };
  recentCampaigns: { id: string; name: string; channel: string; status: string }[];
};

export async function getCommunicationHome(): Promise<CommunicationHome> {
  const providers = { whatsapp: isSendEnabled("WHATSAPP"), email: isSendEnabled("EMAIL"), sms: isSendEnabled("SMS") };
  if (!process.env.DATABASE_URL) {
    return { campaignsInReview: 0, repliesNeedingAction: 0, failedDeliveries: 0, incompleteTemplates: 0, providers, recentCampaigns: [] };
  }

  const [inReview, failed, recent, conversations, waT, emailT] = await Promise.all([
    prisma.communicationCampaign.count({ where: { status: "REVIEW" } }).catch(() => 0),
    prisma.communicationDelivery.count({ where: { status: "FAILED" } }).catch(() => 0),
    prisma.communicationCampaign.findMany({ orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, name: true, channel: true, status: true } }).catch(() => []),
    listConversations().catch(() => []),
    listChannelTemplates("WHATSAPP"),
    listChannelTemplates("EMAIL"),
  ]);

  const enabledCount = SUPPORTED_LOCALES.length;
  const incompleteTemplates = [...waT, ...emailT].filter((t) => t.availableLocales.length < enabledCount).length;

  return {
    campaignsInReview: inReview,
    repliesNeedingAction: conversations.filter((c) => c.needsReply).length,
    failedDeliveries: failed,
    incompleteTemplates,
    providers,
    recentCampaigns: recent,
  };
}
