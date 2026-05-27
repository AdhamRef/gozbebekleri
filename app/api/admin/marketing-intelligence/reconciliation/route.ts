import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Attribution = Record<string, unknown>;

type Bucket = {
  key: string;
  label: string;
  source?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  siteDonations: number;
  siteRevenue: number;
  platformSpend: number;
  platformReportedConversions: number;
  platformReportedValue: number;
  matchedStrong: number;
  matchedMedium: number;
  matchedWeak: number;
};

function isRecord(value: unknown): value is Attribution {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(source: unknown, key: string): string | null {
  if (!isRecord(source)) return null;
  const value = source[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizedCountry(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.length === 2 ? trimmed.toUpperCase() : trimmed;
}

function numberParam(request: NextRequest, key: string, fallback: number, min: number, max: number): number {
  const raw = Number(request.nextUrl.searchParams.get(key));
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(Math.floor(raw), max));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function attributionQuality(attribution: unknown) {
  const a = isRecord(attribution) ? attribution : null;
  let score = 0;
  if (stringValue(a, "fbclid")) score += 4;
  if (stringValue(a, "fbc")) score += 4;
  if (stringValue(a, "fbp")) score += 2;
  if (stringValue(a, "utm_source") || stringValue(a, "utm_campaign") || stringValue(a, "utm_medium")) score += 1;
  if (stringValue(a, "campaign_id") || stringValue(a, "utm_id")) score += 2;
  if (stringValue(a, "ad_id")) score += 2;
  if (stringValue(a, "adset_id") || stringValue(a, "ad_group_id")) score += 1;
  if (score >= 6) return "strong" as const;
  if (score >= 3) return "medium" as const;
  return "weak" as const;
}

function platformFromAttribution(attribution: unknown) {
  const source = stringValue(attribution, "utm_source")?.toLowerCase();
  const channel = stringValue(attribution, "channel")?.toLowerCase();
  if ([source, channel].some((x) => x?.includes("facebook") || x?.includes("instagram") || x?.includes("meta") || x === "ig" || x === "fb")) return "META";
  if ([source, channel].some((x) => x?.includes("google"))) return "GOOGLE_ADS";
  if ([source, channel].some((x) => x?.includes("tiktok"))) return "TIKTOK";
  if ([source, channel].some((x) => x === "x" || x?.includes("twitter"))) return "X";
  return "UNKNOWN";
}

function bucketKey(attribution: unknown) {
  const campaignId = stringValue(attribution, "campaign_id") || stringValue(attribution, "utm_id");
  const adId = stringValue(attribution, "ad_id");
  const campaignName = stringValue(attribution, "utm_campaign") || stringValue(attribution, "campaign_name");
  if (adId) return `ad:${adId}`;
  if (campaignId) return `campaign:${campaignId}`;
  if (campaignName) return `utm:${campaignName}`;
  return "unattributed";
}

function labelForAttribution(attribution: unknown) {
  return stringValue(attribution, "ad_name")
    || stringValue(attribution, "utm_content")
    || stringValue(attribution, "utm_campaign")
    || stringValue(attribution, "campaign_id")
    || stringValue(attribution, "utm_id")
    || "غير منسوب";
}

function ensureBucket(map: Map<string, Bucket>, key: string, label: string): Bucket {
  let row = map.get(key);
  if (!row) {
    row = {
      key,
      label,
      source: null,
      campaignId: null,
      campaignName: null,
      adsetId: null,
      adId: null,
      siteDonations: 0,
      siteRevenue: 0,
      platformSpend: 0,
      platformReportedConversions: 0,
      platformReportedValue: 0,
      matchedStrong: 0,
      matchedMedium: 0,
      matchedWeak: 0,
    };
    map.set(key, row);
  }
  return row;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const days = numberParam(request, "days", 7, 1, 90);
  const platform = (request.nextUrl.searchParams.get("platform") || "META").trim().toUpperCase();
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);

  const donations = await prisma.donation.findMany({
    where: { status: "PAID", paidAt: { gte: from, lte: to } },
    select: {
      id: true,
      amount: true,
      amountUSD: true,
      currency: true,
      paidAt: true,
      donorCountryCode: true,
      attribution: true,
      conversionEventsSentAt: true,
    },
    orderBy: { paidAt: "desc" },
    take: 2000,
  });

  const campaignSnapshots = await prisma.adCampaignSnapshot.findMany({
    where: { platform, date: { gte: from, lte: to } },
    select: { campaignId: true, campaignName: true, spend: true, reportedConversions: true, reportedConversionValue: true, currency: true },
    take: 5000,
  });
  const adSnapshots = await prisma.adSnapshot.findMany({
    where: { platform, date: { gte: from, lte: to } },
    select: { adId: true, adName: true, campaignId: true, campaignName: true, adGroupId: true, spend: true, reportedConversions: true, reportedConversionValue: true, country: true, currency: true },
    take: 5000,
  });

  const buckets = new Map<string, Bucket>();
  const countryMismatches: Array<Record<string, unknown>> = [];
  let paidRevenue = 0;
  let platformAttributedDonations = 0;
  let cApiMarkedSent = 0;
  let strongAttribution = 0;
  let mediumAttribution = 0;
  let weakAttribution = 0;

  for (const donation of donations) {
    const attribution = donation.attribution;
    const amount = Number(donation.amountUSD ?? donation.amount ?? 0) || 0;
    paidRevenue += amount;
    if (donation.conversionEventsSentAt) cApiMarkedSent += 1;
    if (platformFromAttribution(attribution) === platform) platformAttributedDonations += 1;

    const key = bucketKey(attribution);
    const bucket = ensureBucket(buckets, key, labelForAttribution(attribution));
    bucket.siteDonations += 1;
    bucket.siteRevenue += amount;
    bucket.source ||= stringValue(attribution, "utm_source") || stringValue(attribution, "channel");
    bucket.campaignId ||= stringValue(attribution, "campaign_id") || stringValue(attribution, "utm_id");
    bucket.campaignName ||= stringValue(attribution, "utm_campaign") || stringValue(attribution, "campaign_name");
    bucket.adsetId ||= stringValue(attribution, "adset_id") || stringValue(attribution, "ad_group_id");
    bucket.adId ||= stringValue(attribution, "ad_id");

    const quality = attributionQuality(attribution);
    if (quality === "strong") { strongAttribution += 1; bucket.matchedStrong += 1; }
    else if (quality === "medium") { mediumAttribution += 1; bucket.matchedMedium += 1; }
    else { weakAttribution += 1; bucket.matchedWeak += 1; }

    const adCountry = normalizedCountry(stringValue(attribution, "target_country") || stringValue(attribution, "ad_country") || stringValue(attribution, "country"));
    const donorCountry = normalizedCountry(donation.donorCountryCode || stringValue(attribution, "donor_country") || stringValue(attribution, "billing_country"));
    if (adCountry && donorCountry && adCountry !== donorCountry) {
      countryMismatches.push({
        donationId: donation.id,
        amount,
        currency: donation.currency,
        adCountry,
        donorCountry,
        source: bucket.source,
        campaign: bucket.campaignName ?? bucket.campaignId,
        adId: bucket.adId,
      });
    }
  }

  let platformSpend = 0;
  let platformConversions = 0;
  let platformValue = 0;
  for (const snap of campaignSnapshots) {
    platformSpend += snap.spend || 0;
    platformConversions += snap.reportedConversions || 0;
    platformValue += snap.reportedConversionValue || 0;
    const key = `campaign:${snap.campaignId}`;
    const bucket = ensureBucket(buckets, key, snap.campaignName || snap.campaignId);
    bucket.campaignId ||= snap.campaignId;
    bucket.campaignName ||= snap.campaignName;
    bucket.platformSpend += snap.spend || 0;
    bucket.platformReportedConversions += snap.reportedConversions || 0;
    bucket.platformReportedValue += snap.reportedConversionValue || 0;
  }
  for (const snap of adSnapshots) {
    const key = `ad:${snap.adId}`;
    const bucket = ensureBucket(buckets, key, snap.adName || snap.adId);
    bucket.adId ||= snap.adId;
    bucket.campaignId ||= snap.campaignId;
    bucket.campaignName ||= snap.campaignName;
    bucket.adsetId ||= snap.adGroupId;
    bucket.platformSpend += snap.spend || 0;
    bucket.platformReportedConversions += snap.reportedConversions || 0;
    bucket.platformReportedValue += snap.reportedConversionValue || 0;
  }

  const rows = [...buckets.values()].map((row) => ({
    ...row,
    actualRoas: row.platformSpend > 0 ? row.siteRevenue / row.platformSpend : null,
    platformRoas: row.platformSpend > 0 ? row.platformReportedValue / row.platformSpend : null,
    conversionGap: row.siteDonations - row.platformReportedConversions,
    valueGap: row.siteRevenue - row.platformReportedValue,
  })).sort((a, b) => Math.max(b.siteRevenue, b.platformReportedValue) - Math.max(a.siteRevenue, a.platformReportedValue)).slice(0, 100);

  const recommendations: string[] = [];
  if (platformSpend > 0 && paidRevenue === 0) recommendations.push("يوجد إنفاق منصات بدون تبرعات فعلية في الموقع خلال الفترة؛ راجع الحملات/الدول الأعلى إنفاقًا.");
  if (weakAttribution > 0) recommendations.push(`يوجد ${weakAttribution} تبرع بإسناد ضعيف؛ راجع روابط UTM و fbclid/fbc.`);
  if (countryMismatches.length > 0) recommendations.push(`يوجد ${countryMismatches.length} اختلاف دولة بين الإعلان/الرابط ودولة المتبرع؛ لا تعتبره خطأ مباشرًا لكن راجعه في الاستهداف والدفع.`);
  if (platformConversions > donations.length * 1.4 && donations.length > 0) recommendations.push("نتائج المنصة أعلى بكثير من التبرعات الفعلية؛ راجع attribution window و view-through conversions.");
  if (cApiMarkedSent < donations.length) recommendations.push("بعض التبرعات المدفوعة ليست موسومة كمرسلة CAPI؛ شغّل مراجعة التحويلات المفقودة.");

  return NextResponse.json({
    ok: true,
    platform,
    range: { from: dateKey(from), to: dateKey(to), days },
    summary: {
      sitePaidDonations: donations.length,
      siteRevenue: paidRevenue,
      platformAttributedDonations,
      cApiMarkedSent,
      platformSpend,
      platformReportedConversions: platformConversions,
      platformReportedValue: platformValue,
      actualRoas: platformSpend > 0 ? paidRevenue / platformSpend : null,
      platformRoas: platformSpend > 0 ? platformValue / platformSpend : null,
      attribution: { strong: strongAttribution, medium: mediumAttribution, weak: weakAttribution },
      countryMismatchCount: countryMismatches.length,
    },
    rows,
    countryMismatches: countryMismatches.slice(0, 100),
    recommendations,
  });
}
