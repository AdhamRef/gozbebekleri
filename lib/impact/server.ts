import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { convertAmountInCurrencyToUsd } from "@/lib/exchange/convert-amount-in-currency-to-usd";
import {
  IMPACT_FUNDRAISING_MODE,
  impactLineUSD,
  pickText,
  readImpactConfig,
  type LocalizedText,
} from "@/lib/impact/config";

export class ImpactSelectionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type ResolvedImpactLine = {
  regionKey: string;
  needKey: string;
  quantity: number;
  unitPriceUSD: number;
  amountUSD: number;
};

export type ResolvedImpactSelection = {
  impactCampaignId: string;
  campaignId: string;
  totalUSD: number;
  lines: ResolvedImpactLine[];
};

const MAX_LINES = 200;
/** Client prices use cached rates (≤ 1h old); allow that drift, nothing more. */
const AMOUNT_TOLERANCE = 0.03;

/**
 * Validates an impact selection against the stored config and prices it in USD
 * from the DB — client prices are never trusted.
 */
export async function resolveImpactSelection(input: unknown): Promise<ResolvedImpactSelection> {
  const body = (input ?? {}) as { impactCampaignId?: unknown; lines?: unknown };
  const impactCampaignId = typeof body.impactCampaignId === "string" ? body.impactCampaignId : "";
  if (!/^[a-f0-9]{24}$/i.test(impactCampaignId)) throw new ImpactSelectionError("Invalid impact campaign");
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > MAX_LINES) {
    throw new ImpactSelectionError("Invalid impact selection");
  }

  const impact = await prisma.impactCampaign.findUnique({
    where: { id: impactCampaignId },
    select: { id: true, isActive: true, campaignId: true, regions: true, needs: true },
  });
  if (!impact) throw new ImpactSelectionError("Impact campaign not found", 404);
  if (!impact.isActive) throw new ImpactSelectionError("Impact campaign is not active");

  const config = readImpactConfig(impact);
  const regions = new Map(config.regions.filter((r) => r.active).map((r) => [r.key, r]));
  const needs = new Map(config.needs.filter((n) => n.active).map((n) => [n.key, n]));

  const merged = new Map<string, ResolvedImpactLine>();
  for (const raw of body.lines as Array<Record<string, unknown>>) {
    const regionKey = String(raw?.regionKey ?? "");
    const needKey = String(raw?.needKey ?? "");
    const quantity = Number(raw?.quantity);
    const need = needs.get(needKey);
    if (!regions.has(regionKey) || !need) throw new ImpactSelectionError("Unknown region or need");
    if (!Number.isInteger(quantity) || quantity < 1) throw new ImpactSelectionError("Invalid quantity");
    const id = `${regionKey}|${needKey}`;
    const qty = (merged.get(id)?.quantity ?? 0) + quantity;
    if (qty > need.maxQuantity) throw new ImpactSelectionError("Quantity exceeds the allowed maximum");
    merged.set(id, {
      regionKey,
      needKey,
      quantity: qty,
      unitPriceUSD: need.priceUSD,
      amountUSD: impactLineUSD(need.priceUSD, qty),
    });
  }

  const lines = [...merged.values()];
  const totalUSD = Math.round(lines.reduce((s, l) => s + l.amountUSD, 0) * 100) / 100;
  return { impactCampaignId: impact.id, campaignId: impact.campaignId, totalUSD, lines };
}

/** Rejects a client-side amount that doesn't match the server price (beyond rate drift). */
export async function assertImpactAmountMatches(
  selection: ResolvedImpactSelection,
  amount: number,
  currency: string
): Promise<void> {
  const usd = await convertAmountInCurrencyToUsd(amount, currency);
  if (!Number.isFinite(usd) || Math.abs(usd - selection.totalUSD) > selection.totalUSD * AMOUNT_TOLERANCE + 0.01) {
    throw new ImpactSelectionError("Prices changed — please refresh the page and try again", 409);
  }
}

export function impactLinesCreateData(selection: ResolvedImpactSelection) {
  return selection.lines.map((l) => ({ ...l, impactCampaignId: selection.impactCampaignId }));
}

type Tx = Prisma.TransactionClient | PrismaClient;

/** Creates the hidden settlement Campaign row an ImpactCampaign donates through. */
export async function createBackingCampaign(tx: Tx, title: LocalizedText, slug: string) {
  // Campaign.slug is globally unique; the "impact-" prefix keeps it apart from
  // real projects, the suffix covers a builder whose slug was renamed and reused.
  let backingSlug = `impact-${slug}`;
  if (await tx.campaign.findFirst({ where: { slug: backingSlug }, select: { id: true } })) {
    backingSlug = `${backingSlug}-${Date.now().toString(36)}`;
  }
  const created = await tx.campaign.create({
    data: {
      title: pickText(title, "ar"),
      description: pickText(title, "ar"),
      // Never routed publicly (inactive), so the slug is only an identifier.
      slug: backingSlug,
      targetAmount: 0,
      images: [],
      // Inactive so every public list/sitemap skips it; donations are allowed
      // through it only via the impact path in POST /api/donations.
      isActive: false,
      goalType: "OPEN",
      fundraisingMode: IMPACT_FUNDRAISING_MODE,
      categoryIds: [],
    },
    select: { id: true },
  });
  await syncBackingCampaignTitle(tx, created.id, title);
  return created;
}

/** Mirrors the builder title onto the backing campaign so receipts/reports show it per locale. */
export async function syncBackingCampaignTitle(tx: Tx, campaignId: string, title: LocalizedText) {
  const ar = pickText(title, "ar");
  await tx.campaign.update({ where: { id: campaignId }, data: { title: ar, description: ar } });
  for (const [locale, text] of Object.entries(title)) {
    if (locale === "ar" || !text) continue;
    await tx.campaignTranslation.upsert({
      where: { campaignId_locale: { campaignId, locale } },
      create: { campaignId, locale, title: text, description: text },
      update: { title: text, description: text },
    });
  }
}
