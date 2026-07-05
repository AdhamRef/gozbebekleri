import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES, LOCALES, type SupportedLocale } from "@/lib/locales";
import { listSenders } from "./sender-service";
import { listChannelTemplates } from "./template-compat";
import { getRecipientBreakdown } from "./campaign-recipient-service";
import { listConversations } from "./conversation-service";

/**
 * Read-only Communication Center reports: delivery performance by channel and language, failed
 * deliveries, sender performance, WhatsApp replies needing action, missing consent, and missing
 * template languages. Everything is derived from real archive data; no fake attribution — when there
 * is no data a section is simply empty.
 */

type StatusCounts = { total: number; delivered: number; read: number; failed: number; skipped: number; sent: number };

function emptyCounts(): StatusCounts {
  return { total: 0, delivered: 0, read: 0, failed: 0, skipped: 0, sent: 0 };
}
function tally(c: StatusCounts, status: string) {
  c.total += 1;
  if (status === "DELIVERED") c.delivered += 1;
  else if (status === "READ") c.read += 1;
  else if (status === "FAILED" || status === "BOUNCED") c.failed += 1;
  else if (status === "SKIPPED") c.skipped += 1;
  else if (status === "SENT" || status === "SENT_TO_PROVIDER") c.sent += 1;
}

export type CommunicationReport = {
  generatedAt: string;
  totalDeliveries: number;
  byChannel: { channel: string; counts: StatusCounts }[];
  byLanguage: { locale: string; label: string; counts: StatusCounts }[];
  bySender: { senderId: string; name: string; counts: StatusCounts }[];
  failedRecent: { id: string; channel: string; locale: string | null; reason: string | null; at: string }[];
  repliesNeedingAction: number;
  missingConsentWhatsApp: number;
  missingTemplateLanguages: { channel: string; locales: string[] }[];
};

export async function getCommunicationReport(): Promise<CommunicationReport> {
  if (!process.env.DATABASE_URL) {
    return { generatedAt: new Date().toISOString(), totalDeliveries: 0, byChannel: [], byLanguage: [], bySender: [], failedRecent: [], repliesNeedingAction: 0, missingConsentWhatsApp: 0, missingTemplateLanguages: [] };
  }

  const deliveries = await prisma.communicationDelivery
    .findMany({ orderBy: { createdAt: "desc" }, take: 3000, select: { id: true, channel: true, status: true, locale: true, senderId: true, errorMessage: true, createdAt: true } })
    .catch(() => []);

  const channelMap = new Map<string, StatusCounts>();
  const langMap = new Map<string, StatusCounts>();
  const senderMap = new Map<string, StatusCounts>();
  for (const d of deliveries) {
    const ch = channelMap.get(d.channel) ?? emptyCounts();
    tally(ch, d.status);
    channelMap.set(d.channel, ch);
    if (d.locale) {
      const lg = langMap.get(d.locale) ?? emptyCounts();
      tally(lg, d.status);
      langMap.set(d.locale, lg);
    }
    if (d.senderId) {
      const sd = senderMap.get(d.senderId) ?? emptyCounts();
      tally(sd, d.status);
      senderMap.set(d.senderId, sd);
    }
  }

  const [senders, conversations, waTemplates, emailTemplates, waAudience] = await Promise.all([
    listSenders(),
    listConversations().catch(() => []),
    listChannelTemplates("WHATSAPP"),
    listChannelTemplates("EMAIL"),
    getRecipientBreakdown("WHATSAPP").catch(() => null),
  ]);
  const senderName = (id: string) => senders.find((s) => s.id === id)?.name ?? "—";

  // Languages that have eligible WhatsApp recipients but no template variant covers them.
  const templateLocales = (list: { availableLocales: string[] }[]) => new Set(list.flatMap((t) => t.availableLocales));
  const waCovered = templateLocales(waTemplates);
  const emailCovered = templateLocales(emailTemplates);
  const audienceLangs: SupportedLocale[] = waAudience ? waAudience.locales.filter((l) => l.eligible > 0 || l.needsReview > 0).map((l) => l.locale) : [];
  const missingTemplateLanguages: { channel: string; locales: string[] }[] = [];
  const waMissing = audienceLangs.filter((l) => !waCovered.has(l));
  if (waMissing.length) missingTemplateLanguages.push({ channel: "WHATSAPP", locales: waMissing });
  const emailMissing = audienceLangs.filter((l) => !emailCovered.has(l));
  if (emailMissing.length) missingTemplateLanguages.push({ channel: "EMAIL", locales: emailMissing });

  return {
    generatedAt: new Date().toISOString(),
    totalDeliveries: deliveries.length,
    byChannel: [...channelMap.entries()].map(([channel, counts]) => ({ channel, counts })),
    byLanguage: SUPPORTED_LOCALES.filter((l) => langMap.has(l)).map((l) => ({ locale: l, label: LOCALES[l].label, counts: langMap.get(l)! })),
    bySender: [...senderMap.entries()].map(([senderId, counts]) => ({ senderId, name: senderName(senderId), counts })),
    failedRecent: deliveries.filter((d) => d.status === "FAILED" || d.status === "SKIPPED").slice(0, 25).map((d) => ({ id: d.id, channel: d.channel, locale: d.locale, reason: d.errorMessage, at: d.createdAt.toISOString() })),
    repliesNeedingAction: conversations.filter((c) => c.needsReply).length,
    missingConsentWhatsApp: waAudience?.totals.needsReview ?? 0,
    missingTemplateLanguages,
  };
}
