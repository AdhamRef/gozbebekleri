import { prisma } from "@/lib/prisma";
import { ensureConversionEventIndexes } from "@/lib/tracking/conversion-event-indexes";

export type ConversionTimelineStatus = "SENT" | "FAILED" | "SKIPPED" | "PENDING" | "MISSING";

export type ConversionTimelineStep = {
  id: string;
  label: string;
  platform: string;
  channel: string;
  eventName: string;
  status: ConversionTimelineStatus;
  attempts: number;
  eventId: string | null;
  error: string | null;
  updatedAt: string | null;
};

export type DonationConversionTimeline = {
  source: string;
  generatedAt: string;
  donation: {
    id: string;
    status: string;
    paidAt: string | null;
    amount: number;
    currency: string | null;
  } | null;
  summary: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    pending: number;
    missing: number;
  };
  steps: ConversionTimelineStep[];
};

type RawConversionEvent = {
  eventId?: string;
  eventName?: string;
  platform?: string;
  channel?: string;
  status?: ConversionTimelineStatus;
  attempts?: number;
  error?: string | null;
  updatedAt?: Date | string | { $date?: string };
  createdAt?: Date | string | { $date?: string };
};

const expectedSteps = [
  { platform: "META", channel: "server", eventName: "Donate", label: "Meta Server Conversion" },
  { platform: "META", channel: "browser", eventName: "Donate", label: "Meta Browser Pixel" },
  { platform: "GA4", channel: "server", eventName: "purchase", label: "GA4 Server Purchase" },
  { platform: "GOOGLE_ADS", channel: "browser", eventName: "conversion", label: "Google Ads Browser Conversion" },
  { platform: "TIKTOK", channel: "browser", eventName: "CompletePayment", label: "TikTok Browser CompletePayment" },
  { platform: "X", channel: "browser", eventName: "Donate", label: "X Browser Conversion" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toIso(value: RawConversionEvent["updatedAt"]): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (isRecord(value) && typeof value.$date === "string") {
    const date = new Date(value.$date);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function eventKey(event: Pick<RawConversionEvent, "platform" | "channel" | "eventName">) {
  return `${event.platform ?? "UNKNOWN"}|${event.channel ?? "server"}|${event.eventName ?? "Donate"}`;
}

function summarize(steps: ConversionTimelineStep[]) {
  return {
    total: steps.length,
    sent: steps.filter((step) => step.status === "SENT").length,
    failed: steps.filter((step) => step.status === "FAILED").length,
    skipped: steps.filter((step) => step.status === "SKIPPED").length,
    pending: steps.filter((step) => step.status === "PENDING").length,
    missing: steps.filter((step) => step.status === "MISSING").length,
  };
}

export async function getDonationConversionTimeline(donationId: string): Promise<DonationConversionTimeline> {
  await ensureConversionEventIndexes();

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, status: true, paidAt: true, totalAmount: true, amount: true, currency: true },
  });

  const result = await prisma.$runCommandRaw({
    find: "ConversionEvent",
    filter: { donationId },
    sort: { updatedAt: -1, createdAt: -1 },
    limit: 100,
    projection: {
      eventId: 1,
      eventName: 1,
      platform: 1,
      channel: 1,
      status: 1,
      attempts: 1,
      error: 1,
      updatedAt: 1,
      createdAt: 1,
    },
  });

  const rows: RawConversionEvent[] = isRecord(result) && isRecord(result.cursor) && Array.isArray(result.cursor.firstBatch)
    ? result.cursor.firstBatch as RawConversionEvent[]
    : [];

  const byKey = new Map<string, RawConversionEvent>();
  for (const row of rows) {
    const key = eventKey(row);
    if (!byKey.has(key)) byKey.set(key, row);
  }

  const expected = expectedSteps.map((step): ConversionTimelineStep => {
    const row = byKey.get(eventKey(step));
    return {
      id: eventKey(step),
      label: step.label,
      platform: step.platform,
      channel: step.channel,
      eventName: step.eventName,
      status: row?.status ?? "MISSING",
      attempts: Math.max(0, Number(row?.attempts ?? 0)),
      eventId: row?.eventId ?? null,
      error: row?.error ?? null,
      updatedAt: toIso(row?.updatedAt ?? row?.createdAt),
    };
  });

  const extra = rows
    .filter((row) => !expectedSteps.some((step) => eventKey(step) === eventKey(row)))
    .map((row): ConversionTimelineStep => ({
      id: eventKey(row),
      label: `${row.platform ?? "UNKNOWN"} ${row.channel ?? "server"} ${row.eventName ?? "event"}`,
      platform: row.platform ?? "UNKNOWN",
      channel: row.channel ?? "server",
      eventName: row.eventName ?? "event",
      status: row.status ?? "PENDING",
      attempts: Math.max(0, Number(row.attempts ?? 0)),
      eventId: row.eventId ?? null,
      error: row.error ?? null,
      updatedAt: toIso(row.updatedAt ?? row.createdAt),
    }));

  const steps = [...expected, ...extra];

  return {
    source: "donation-conversion-timeline",
    generatedAt: new Date().toISOString(),
    donation: donation ? {
      id: donation.id,
      status: donation.status,
      paidAt: donation.paidAt?.toISOString() ?? null,
      amount: Number(donation.totalAmount ?? donation.amount ?? 0),
      currency: donation.currency,
    } : null,
    summary: summarize(steps),
    steps,
  };
}
