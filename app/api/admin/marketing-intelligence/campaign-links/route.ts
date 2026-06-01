import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;

type CampaignLinkPayload = {
  name?: string;
  platform?: string;
  channel?: string;
  url?: string;
  basePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmId?: string;
  utmContent?: string;
  campaignId?: string;
  adGroupId?: string;
  adsetId?: string;
  adId?: string;
  audienceSegment?: string;
  messageVariant?: string;
  targetCountry?: string;
  objective?: string;
  raw?: JsonMap;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPayload(body: JsonMap): CampaignLinkPayload {
  return {
    name: readString(body.name) ?? undefined,
    platform: readString(body.platform)?.toUpperCase() ?? undefined,
    channel: readString(body.channel)?.toUpperCase() ?? undefined,
    url: readString(body.url) ?? undefined,
    basePath: readString(body.basePath) ?? undefined,
    utmSource: readString(body.utmSource) ?? readString(body.utm_source) ?? undefined,
    utmMedium: readString(body.utmMedium) ?? readString(body.utm_medium) ?? undefined,
    utmCampaign: readString(body.utmCampaign) ?? readString(body.utm_campaign) ?? undefined,
    utmId: readString(body.utmId) ?? readString(body.utm_id) ?? undefined,
    utmContent: readString(body.utmContent) ?? readString(body.utm_content) ?? undefined,
    campaignId: readString(body.campaignId) ?? readString(body.campaign_id) ?? undefined,
    adGroupId: readString(body.adGroupId) ?? readString(body.ad_group_id) ?? undefined,
    adsetId: readString(body.adsetId) ?? readString(body.adset_id) ?? undefined,
    adId: readString(body.adId) ?? readString(body.ad_id) ?? undefined,
    audienceSegment: readString(body.audienceSegment) ?? readString(body.audience_segment) ?? undefined,
    messageVariant: readString(body.messageVariant) ?? readString(body.message_variant) ?? undefined,
    targetCountry: readString(body.targetCountry) ?? readString(body.target_country) ?? undefined,
    objective: readString(body.objective) ?? undefined,
    raw: typeof body.raw === "object" && body.raw !== null && !Array.isArray(body.raw) ? body.raw as JsonMap : undefined,
  };
}

async function ensureIndexes() {
  await prisma.$runCommandRaw({ createIndexes: "MarketingCampaignLink", indexes: [
    { key: { createdAt: -1 }, name: "createdAt_desc" },
    { key: { platform: 1, createdAt: -1 }, name: "platform_createdAt" },
    { key: { campaignId: 1 }, name: "campaignId" },
    { key: { adId: 1 }, name: "adId" },
    { key: { utmCampaign: 1 }, name: "utmCampaign" },
  ] }).catch(() => null);
}

function numberParam(request: NextRequest, key: string, fallback: number, min: number, max: number) {
  const raw = Number(request.nextUrl.searchParams.get(key));
  return Number.isFinite(raw) ? Math.max(min, Math.min(max, Math.floor(raw))) : fallback;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  await ensureIndexes();
  const limit = numberParam(request, "limit", 50, 1, 200);
  const platform = readString(request.nextUrl.searchParams.get("platform"))?.toUpperCase();
  const filter: JsonMap = platform ? { platform } : {};

  const result = await prisma.$runCommandRaw({
    find: "MarketingCampaignLink",
    filter,
    sort: { createdAt: -1 },
    limit,
  }) as JsonMap;

  const rows = typeof result.cursor === "object" && result.cursor && Array.isArray((result.cursor as JsonMap).firstBatch)
    ? (result.cursor as JsonMap).firstBatch
    : [];

  return NextResponse.json({ ok: true, links: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  await ensureIndexes();
  const body = (await request.json().catch(() => ({}))) as JsonMap;
  const payload = readPayload(body);

  if (!payload.url) return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  if (!payload.platform) return NextResponse.json({ ok: false, error: "missing platform" }, { status: 400 });

  const now = new Date();
  const document = {
    name: payload.name ?? payload.utmCampaign ?? payload.campaignId ?? "Marketing link",
    platform: payload.platform,
    channel: payload.channel ?? payload.platform,
    url: payload.url,
    basePath: payload.basePath ?? null,
    utmSource: payload.utmSource ?? null,
    utmMedium: payload.utmMedium ?? null,
    utmCampaign: payload.utmCampaign ?? null,
    utmId: payload.utmId ?? null,
    utmContent: payload.utmContent ?? null,
    campaignId: payload.campaignId ?? null,
    adGroupId: payload.adGroupId ?? null,
    adsetId: payload.adsetId ?? null,
    adId: payload.adId ?? null,
    audienceSegment: payload.audienceSegment ?? null,
    messageVariant: payload.messageVariant ?? null,
    targetCountry: payload.targetCountry ?? null,
    objective: payload.objective ?? null,
    createdBy: session?.user?.id ?? null,
    raw: payload.raw ?? body,
    createdAt: now,
    updatedAt: now,
  };

  const result = await prisma.$runCommandRaw({ insert: "MarketingCampaignLink", documents: [document] }) as JsonMap;
  return NextResponse.json({ ok: true, inserted: result.n ?? 1, link: document });
}
