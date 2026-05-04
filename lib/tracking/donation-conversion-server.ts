import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

type Attribution = Record<string, string>;

function getStr(j: unknown, k: string): string | undefined {
  if (!j || typeof j !== "object") return undefined;
  const v = (j as Record<string, unknown>)[k];
  return typeof v === "string" ? v : undefined;
}

/**
 * Idempotent: sends Meta CAPI Purchase + GA4 purchase once per donation (payment webhook success).
 * Uses donation.id as event_id / transaction_id for deduplication with browser pixel.
 */
export async function sendDonationServerConversions(donationId: string): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const metaToken = process.env.META_ACCESS_TOKEN;
  const gaMeasurementId = process.env.GA4_MEASUREMENT_ID;
  const gaApiSecret = process.env.GA4_API_SECRET;

  if (!pixelId || !metaToken || !gaMeasurementId || !gaApiSecret) {
    return;
  }

  const row = await prisma.donation.findUnique({
    where: { id: donationId },
    include: {
      donor: { select: { email: true, phone: true } },
      items: { include: { campaign: { select: { title: true } } }, take: 1 },
      categoryItems: { include: { category: { select: { name: true } } }, take: 1 },
    },
  });

  if (!row || row.status !== "PAID" || row.paidAt == null) return;
  if (row.conversionEventsSentAt != null) return;

  const attribution = (row.attribution ?? undefined) as Attribution | undefined;
  const landing = attribution?.landing_page ?? "https://localhost/";
  const amount = Number(row.amountUSD ?? row.amount ?? 0);
  const currency = row.currency || "USD";
  const email = row.donor?.email;
  const phone = row.donor?.phone;
  const contentName =
    row.items[0]?.campaign?.title ??
    row.categoryItems[0]?.category?.name ??
    "Donation";

  const eventTime = Math.floor((row.paidAt ?? new Date()).getTime() / 1000);
  const eventId = row.id;

  const metaPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        event_source_url: landing,
        user_data: {
          ...(email ? { em: [sha256(email)] } : {}),
          ...(phone ? { ph: [sha256(phone.replace(/\D/g, ""))] } : {}),
          ...(attribution?.fbp ? { fbp: attribution.fbp } : {}),
          ...(attribution?.fbc ? { fbc: attribution.fbc } : {}),
          ...(attribution?.client_ip
            ? { client_ip_address: attribution.client_ip.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45) }
            : {}),
          ...(attribution?.user_agent ? { client_user_agent: attribution.user_agent.slice(0, 512) } : {}),
        },
        custom_data: {
          currency,
          value: amount,
          content_name: contentName,
          content_category: "Donation",
          order_id: eventId,
        },
      },
    ],
  };

  const gaClientId = attribution?.ga_client_id || `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
  const sessionIdRaw = attribution?.ga_session_id;
  const sessionNum = sessionIdRaw ? parseInt(sessionIdRaw.replace(/\D/g, "").slice(0, 12), 10) : undefined;

  const gaPayload = {
    client_id: gaClientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: eventId,
          value: amount,
          currency,
          engagement_time_msec: 100,
          affiliation: "Donation Website",
          ...(sessionNum != null && !Number.isNaN(sessionNum) ? { session_id: sessionNum } : {}),
          items: [
            {
              item_id: row.items[0]?.campaignId ?? row.categoryItems[0]?.categoryId ?? "donation",
              item_name: contentName,
              item_category: "Donation",
              price: amount,
              quantity: 1,
            },
          ],
        },
      },
    ],
  };

  try {
    const metaUrl = `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${encodeURIComponent(metaToken)}`;
    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload),
    });
    if (!metaRes.ok) {
      console.error("[conversion] Meta CAPI error", await metaRes.text());
      return;
    }

    const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(gaMeasurementId)}&api_secret=${encodeURIComponent(gaApiSecret)}`;
    const gaRes = await fetch(gaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gaPayload),
    });
    if (!gaRes.ok) {
      console.error("[conversion] GA4 MP error", await gaRes.text());
      return;
    }

    await prisma.donation.update({
      where: { id: donationId },
      data: { conversionEventsSentAt: new Date() },
    });
  } catch (e) {
    console.error("[conversion] sendDonationServerConversions", e);
  }
}
