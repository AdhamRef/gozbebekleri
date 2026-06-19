import { prisma } from "@/lib/prisma";

export type CampaignLinkStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export type CampaignLinkInput = {
  name: string;
  platform: string;
  channel?: string | null;
  url: string;
  basePath?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmId?: string | null;
  utmContent?: string | null;
  campaignId?: string | null;
  adGroupId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  targetCountry?: string | null;
  objective?: string | null;
  audienceSegment?: string | null;
  messageVariant?: string | null;
  internalNotes?: string | null;
  createdBy?: string | null;
};

export type CampaignLinkRecord = CampaignLinkInput & {
  id: string;
  status: CampaignLinkStatus;
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

type MongoDoc = Record<string, unknown>;

function isMap(value: unknown): value is MongoDoc {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function idString(value: unknown) {
  if (typeof value === "string") return value;
  if (isMap(value) && typeof value.$oid === "string") return value.$oid;
  return "";
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toDateIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  if (isMap(value) && typeof value.$date === "string") {
    const date = new Date(value.$date);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  return new Date().toISOString();
}

function normalizePlatform(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function normalizeStatus(value: unknown): CampaignLinkStatus {
  const status = typeof value === "string" ? value.toUpperCase() : "ACTIVE";
  if (status === "ARCHIVED" || status === "DELETED") return status;
  return "ACTIVE";
}

function cleanInput(input: CampaignLinkInput) {
  return {
    name: input.name.trim(),
    platform: normalizePlatform(input.platform),
    channel: stringOrNull(input.channel),
    url: input.url.trim(),
    basePath: stringOrNull(input.basePath),
    utmSource: stringOrNull(input.utmSource),
    utmMedium: stringOrNull(input.utmMedium),
    utmCampaign: stringOrNull(input.utmCampaign),
    utmId: stringOrNull(input.utmId),
    utmContent: stringOrNull(input.utmContent),
    campaignId: stringOrNull(input.campaignId),
    adGroupId: stringOrNull(input.adGroupId),
    adsetId: stringOrNull(input.adsetId),
    adId: stringOrNull(input.adId),
    targetCountry: stringOrNull(input.targetCountry)?.toUpperCase() ?? null,
    objective: stringOrNull(input.objective),
    audienceSegment: stringOrNull(input.audienceSegment),
    messageVariant: stringOrNull(input.messageVariant),
    internalNotes: stringOrNull(input.internalNotes),
    createdBy: stringOrNull(input.createdBy),
  };
}

function mapCampaignLink(doc: MongoDoc): CampaignLinkRecord {
  return {
    id: idString(doc._id),
    name: stringOrNull(doc.name) ?? stringOrNull(doc.utmCampaign) ?? "Marketing link",
    platform: stringOrNull(doc.platform) ?? "UNKNOWN",
    channel: stringOrNull(doc.channel),
    url: stringOrNull(doc.url) ?? "",
    basePath: stringOrNull(doc.basePath),
    utmSource: stringOrNull(doc.utmSource),
    utmMedium: stringOrNull(doc.utmMedium),
    utmCampaign: stringOrNull(doc.utmCampaign),
    utmId: stringOrNull(doc.utmId),
    utmContent: stringOrNull(doc.utmContent),
    campaignId: stringOrNull(doc.campaignId),
    adGroupId: stringOrNull(doc.adGroupId),
    adsetId: stringOrNull(doc.adsetId),
    adId: stringOrNull(doc.adId),
    targetCountry: stringOrNull(doc.targetCountry),
    objective: stringOrNull(doc.objective),
    audienceSegment: stringOrNull(doc.audienceSegment),
    messageVariant: stringOrNull(doc.messageVariant),
    internalNotes: stringOrNull(doc.internalNotes),
    createdBy: stringOrNull(doc.createdBy),
    status: normalizeStatus(doc.status),
    saveCount: typeof doc.saveCount === "number" ? doc.saveCount : 0,
    createdAt: toDateIso(doc.createdAt),
    updatedAt: toDateIso(doc.updatedAt),
  };
}

export async function ensureCampaignLinkIndexes() {
  await prisma.$runCommandRaw({ createIndexes: "MarketingCampaignLink", indexes: [
    { key: { url: 1 }, name: "url_unique", unique: true },
    { key: { platform: 1, status: 1, updatedAt: -1 }, name: "platform_status_updatedAt" },
    { key: { campaignId: 1 }, name: "campaignId" },
    { key: { adId: 1 }, name: "adId" },
    { key: { utmCampaign: 1 }, name: "utmCampaign" },
  ] }).catch(() => null);
}

export async function createOrUpdateCampaignLink(input: CampaignLinkInput): Promise<CampaignLinkRecord> {
  await ensureCampaignLinkIndexes();
  const now = new Date();
  const payload = cleanInput(input);

  const result = await prisma.$runCommandRaw({
    findAndModify: "MarketingCampaignLink",
    query: { url: payload.url },
    update: {
      $set: { ...payload, status: "ACTIVE", updatedAt: now },
      $setOnInsert: { createdAt: now, saveCount: 0 },
      $inc: { saveCount: 1 },
    },
    upsert: true,
    new: true,
  }) as MongoDoc;

  const value = isMap(result.value) ? result.value : {};
  return mapCampaignLink(value);
}

export async function listCampaignLinks(limit = 100): Promise<CampaignLinkRecord[]> {
  await ensureCampaignLinkIndexes();
  const result = await prisma.$runCommandRaw({
    find: "MarketingCampaignLink",
    filter: { $or: [{ status: "ACTIVE" }, { status: { $exists: false } }, { status: null }] },
    sort: { updatedAt: -1, createdAt: -1 },
    limit,
  }) as MongoDoc;

  const rows = isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch : [];
  return rows.filter(isMap).map(mapCampaignLink);
}
