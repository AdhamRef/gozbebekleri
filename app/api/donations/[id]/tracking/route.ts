/**
 * GET /api/donations/[id]/tracking
 *
 * READ-ONLY tracking-payload endpoint. Returns the canonical Donate event
 * shape the browser should fire to Meta Pixel — but ONLY if the donation is
 * genuinely PAID in our database. Everything else (PENDING, FAILED, missing
 * row) returns `{ ok: false, reason }` and the browser MUST NOT fire fbq.
 *
 * Why a separate read-only endpoint:
 *   • POST /api/donations/:id/track-conversion atomically *claims* the right
 *     to fire CAPI and stamps `conversionEventsSentAt`. It's the right place
 *     for the actual fire orchestration, but it's a side-effecting POST and
 *     it returns minimal data (allowed / alreadyFired / eventId).
 *   • This endpoint is a pure read. The /success page (or any future client
 *     that just wants the canonical tracking payload — receipt page, admin
 *     replay tool, etc.) calls it to get value/currency/contents straight
 *     from the DB without having to know the donation's internal schema.
 *
 * Value, currency, content_ids, contents, content_name, content_category —
 * ALL sourced from the donation row in the database. Never from URL params,
 * cookies, UI state, or CurrencyProvider. This is the rule the user's audit
 * specifically called out: the site has a URL-says-TRY / UI-shows-USD
 * currency drift, and the source of truth for what we tell Meta must be the
 * payment record.
 *
 * The shape mirrors `sendDonationServerConversions` so the browser fbq fire
 * is bit-identical to the CAPI fire — same shared `event_id` (donate_<id>)
 * lets Meta dedupe the pair into a single conversion.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { metaDonationEventId } from "@/lib/tracking/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrackingContent {
  id: string;
  quantity: number;
  item_price: number;
}

interface TrackingResponseOk {
  ok: true;
  eventName: "Donate";
  eventId: string;
  transactionId: string;
  orderId: string;
  value: number;
  currency: string;
  contentType: "donation";
  contentIds: string[];
  contentName: string;
  contentCategory: string;
  contents: TrackingContent[];
  numItems: number;
  status: "paid";
  success: true;
  paymentInfoAvailable: true;
  donationType: "ONE_TIME" | "MONTHLY";
  paymentMethod: string;
}

interface TrackingResponseFail {
  ok: false;
  reason: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json<TrackingResponseFail>(
      { ok: false, reason: "missing donation id" },
      { status: 400 }
    );
  }

  const row = await prisma.donation.findUnique({
    where: { id },
    include: {
      items: { include: { campaign: { select: { id: true, title: true } } } },
      categoryItems: { include: { category: { select: { id: true, name: true } } } },
    },
  });

  if (!row) {
    return NextResponse.json<TrackingResponseFail>(
      { ok: false, reason: "not found" },
      { status: 404 }
    );
  }

  // Hard gate: ALL three must be true. The site's tracking integrity rests
  // on this — Meta must only ever see Donate for a row that's actually paid.
  if (row.status !== "PAID") {
    return NextResponse.json<TrackingResponseFail>(
      { ok: false, reason: `not paid (status=${row.status})` },
      { status: 200 }
    );
  }
  if (row.paidAt == null) {
    return NextResponse.json<TrackingResponseFail>(
      { ok: false, reason: "paidAt unset" },
      { status: 200 }
    );
  }
  const value = Number(row.amount ?? 0);
  if (!(value > 0)) {
    return NextResponse.json<TrackingResponseFail>(
      { ok: false, reason: "amount <= 0" },
      { status: 200 }
    );
  }

  // ─── Build contents from items + categoryItems ──────────────────────────
  const contents: TrackingContent[] = [];
  const contentIds: string[] = [];
  let primaryName: string | undefined;

  for (const it of row.items) {
    contents.push({ id: it.campaignId, quantity: 1, item_price: it.amount });
    contentIds.push(it.campaignId);
    if (!primaryName && it.campaign?.title) primaryName = it.campaign.title;
  }
  for (const ci of row.categoryItems) {
    contents.push({ id: ci.categoryId, quantity: 1, item_price: ci.amount });
    contentIds.push(ci.categoryId);
    if (!primaryName && ci.category?.name) primaryName = ci.category.name;
  }
  if (contents.length === 0) {
    contents.push({ id: "donation", quantity: 1, item_price: value });
    contentIds.push("donation");
  }

  // Donation has no `type` scalar — the recurring signal is `subscriptionId`.
  // This matches what `donation-conversion-server.ts` uses for the CAPI fire,
  // so browser + CAPI agree on `donation_type`.
  const isMonthly = !!row.subscriptionId;

  const payload: TrackingResponseOk = {
    ok: true,
    eventName: "Donate",
    eventId: metaDonationEventId(row.id, "success"),
    transactionId: row.id,
    orderId: row.id,
    value,
    // Currency from DB row — NOT from cookie, URL, or CurrencyProvider.
    currency: row.currency || "USD",
    contentType: "donation",
    contentIds,
    contentName: primaryName ?? "Donation",
    contentCategory: isMonthly ? "monthly" : "donation",
    contents,
    numItems: contents.reduce((s, c) => s + c.quantity, 0),
    status: "paid",
    success: true,
    paymentInfoAvailable: true,
    donationType: isMonthly ? "MONTHLY" : "ONE_TIME",
    paymentMethod: (row.paymentMethod ?? "CARD").toLowerCase(),
  };

  return NextResponse.json<TrackingResponseOk>(payload, {
    status: 200,
    // The data is immutable once paid (we never edit value/currency of a
    // PAID donation), so the browser can safely cache. But keep it private
    // — donation IDs are guessable enough that we don't want CDN caching.
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
