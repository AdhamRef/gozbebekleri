import { prisma } from "@/lib/prisma";

/**
 * Derives WhatsApp conversations from the existing archive — outbound CommunicationDelivery rows
 * and inbound/status CommunicationProviderEvent rows — grouped by contact phone. No dedicated
 * conversation table is needed. Donor matching is by phone only; ambiguous/absent matches are
 * surfaced as unresolved contacts (never randomly attached).
 */

function digits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export type ConversationDonor = {
  userId: string | null;
  name: string | null;
  email: string | null;
  locale: string | null;
  country: string | null;
  totalDonations: number | null;
  lastDonationAt: string | null;
  whatsappOptIn: boolean;
  doNotContact: boolean;
};

export type ConversationSummary = {
  phone: string;
  donor: ConversationDonor | null;
  unresolved: boolean;
  lastMessageAt: string | null;
  lastInboundText: string | null;
  needsReply: boolean;
  inboundCount: number;
  outboundCount: number;
};

type Bucket = {
  phone: string;
  lastInboundAt: number;
  lastOutboundAt: number;
  lastInboundText: string | null;
  inboundCount: number;
  outboundCount: number;
};

async function matchDonors(phoneDigits: string[]): Promise<Map<string, ConversationDonor[]>> {
  const map = new Map<string, ConversationDonor[]>();
  if (phoneDigits.length === 0 || !process.env.DATABASE_URL) return map;
  const variants = phoneDigits.flatMap((d) => [d, `+${d}`]);
  try {
    const profiles = await prisma.donorCommunicationProfile.findMany({
      where: { phone: { in: variants } },
      select: { userId: true, phone: true, email: true, preferredLocale: true, countryCode: true, totalDonations: true, lastDonationAt: true, whatsappOptIn: true, doNotContact: true },
      take: 1000,
    });
    for (const p of profiles) {
      const key = digits(p.phone);
      const donor: ConversationDonor = {
        userId: p.userId,
        name: null,
        email: p.email,
        locale: p.preferredLocale,
        country: p.countryCode,
        totalDonations: p.totalDonations,
        lastDonationAt: p.lastDonationAt ? p.lastDonationAt.toISOString() : null,
        whatsappOptIn: p.whatsappOptIn,
        doNotContact: p.doNotContact,
      };
      map.set(key, [...(map.get(key) ?? []), donor]);
    }
  } catch (error) {
    console.error("matchDonors failed", error);
  }
  return map;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const [inbound, outbound] = await Promise.all([
    prisma.communicationProviderEvent
      .findMany({ where: { channel: "WHATSAPP", eventType: "inbound_message" }, orderBy: { receivedAt: "desc" }, take: 500, select: { recipient: true, receivedAt: true, payloadSanitized: true } })
      .catch(() => []),
    prisma.communicationDelivery
      .findMany({ where: { channel: "WHATSAPP", recipientPhone: { not: null } }, orderBy: { createdAt: "desc" }, take: 500, select: { recipientPhone: true, createdAt: true } })
      .catch(() => []),
  ]);

  const buckets = new Map<string, Bucket>();
  const ensure = (phone: string) => {
    const key = digits(phone);
    let b = buckets.get(key);
    if (!b) {
      b = { phone: phone, lastInboundAt: 0, lastOutboundAt: 0, lastInboundText: null, inboundCount: 0, outboundCount: 0 };
      buckets.set(key, b);
    }
    return b;
  };

  for (const ev of inbound) {
    if (!ev.recipient) continue;
    const b = ensure(ev.recipient);
    const at = ev.receivedAt?.getTime() ?? 0;
    b.inboundCount += 1;
    if (at >= b.lastInboundAt) {
      b.lastInboundAt = at;
      const p = ev.payloadSanitized as { text?: unknown } | null;
      b.lastInboundText = p && typeof p.text === "string" ? p.text : b.lastInboundText;
    }
  }
  for (const d of outbound) {
    if (!d.recipientPhone) continue;
    const b = ensure(d.recipientPhone);
    b.outboundCount += 1;
    b.lastOutboundAt = Math.max(b.lastOutboundAt, d.createdAt?.getTime() ?? 0);
  }

  const donorMap = await matchDonors([...buckets.keys()]);

  const summaries: ConversationSummary[] = [...buckets.values()].map((b) => {
    const matches = donorMap.get(digits(b.phone)) ?? [];
    const unresolved = matches.length !== 1;
    const donor = matches.length === 1 ? matches[0] : null;
    const lastAt = Math.max(b.lastInboundAt, b.lastOutboundAt);
    return {
      phone: b.phone,
      donor,
      unresolved,
      lastMessageAt: lastAt ? new Date(lastAt).toISOString() : null,
      lastInboundText: b.lastInboundText,
      needsReply: b.lastInboundAt > b.lastOutboundAt,
      inboundCount: b.inboundCount,
      outboundCount: b.outboundCount,
    };
  });

  summaries.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  return summaries;
}

export type TimelineItem = {
  kind: "inbound" | "outbound" | "status";
  at: string | null;
  text: string | null;
  status: string | null;
};

export type ConversationDetail = {
  phone: string;
  donor: ConversationDonor | null;
  unresolved: boolean;
  timeline: TimelineItem[];
};

export async function getConversation(phone: string): Promise<ConversationDetail | null> {
  if (!process.env.DATABASE_URL) return null;
  const target = digits(phone);
  const variants = [target, `+${target}`];

  const [events, deliveries, donorMap] = await Promise.all([
    prisma.communicationProviderEvent.findMany({ where: { channel: "WHATSAPP", recipient: { in: variants } }, orderBy: { receivedAt: "asc" }, take: 500, select: { eventType: true, receivedAt: true, status: true, payloadSanitized: true } }).catch(() => []),
    prisma.communicationDelivery.findMany({ where: { channel: "WHATSAPP", recipientPhone: { in: variants } }, orderBy: { createdAt: "asc" }, take: 500, select: { createdAt: true, renderedBody: true, status: true } }).catch(() => []),
    matchDonors([target]),
  ]);

  const timeline: TimelineItem[] = [];
  for (const d of deliveries) {
    timeline.push({ kind: "outbound", at: d.createdAt?.toISOString() ?? null, text: d.renderedBody ?? null, status: d.status });
  }
  for (const ev of events) {
    if (ev.eventType === "inbound_message") {
      const p = ev.payloadSanitized as { text?: unknown } | null;
      timeline.push({ kind: "inbound", at: ev.receivedAt?.toISOString() ?? null, text: p && typeof p.text === "string" ? p.text : null, status: null });
    } else {
      timeline.push({ kind: "status", at: ev.receivedAt?.toISOString() ?? null, text: null, status: ev.status ?? ev.eventType });
    }
  }
  timeline.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));

  const matches = donorMap.get(target) ?? [];
  return { phone, donor: matches.length === 1 ? matches[0] : null, unresolved: matches.length !== 1, timeline };
}
