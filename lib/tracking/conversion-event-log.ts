import { prisma } from "@/lib/prisma";

export type ConversionPlatform = "META" | "GA4" | "GOOGLE_ADS" | "TIKTOK" | "X" | "VERCEL";
export type ConversionChannel = "server" | "browser";
export type ConversionEventStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface RecordConversionEventInput {
  donationId?: string | null;
  eventId: string;
  eventName: string;
  platform: ConversionPlatform;
  channel: ConversionChannel;
  status: ConversionEventStatus;
  dedupKey?: string | null;
  value?: number | null;
  currency?: string | null;
  error?: string | null;
  request?: unknown;
  response?: unknown;
  sentAt?: Date | null;
}

function oid(id: string | null | undefined) {
  return id && /^[a-f0-9]{24}$/i.test(id) ? { $oid: id } : undefined;
}

export async function recordConversionEvent(input: RecordConversionEventInput): Promise<void> {
  try {
    const now = new Date();
    const sentAt = input.status === "SENT" ? input.sentAt ?? now : input.sentAt ?? null;
    await prisma.$runCommandRaw({
      update: "ConversionEvent",
      updates: [{
        q: { platform: input.platform, eventId: input.eventId, channel: input.channel },
        u: {
          $set: {
            donationId: oid(input.donationId),
            eventId: input.eventId,
            eventName: input.eventName,
            platform: input.platform,
            channel: input.channel,
            status: input.status,
            dedupKey: input.dedupKey ?? input.eventId,
            value: typeof input.value === "number" ? input.value : undefined,
            currency: input.currency ?? undefined,
            error: input.error ? String(input.error).slice(0, 800) : undefined,
            request: input.request ?? undefined,
            response: input.response ?? undefined,
            sentAt: sentAt ?? undefined,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now, attempts: 0 },
          $inc: { attempts: 1 },
        },
        upsert: true,
      }],
    });
  } catch (error) {
    console.error("[conversion-event-log] failed", error);
  }
}
