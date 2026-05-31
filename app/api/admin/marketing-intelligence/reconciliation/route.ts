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
  adsetName?: string | null;
  adId?: string | null;
  siteDonations: number;
  siteRevenue: number;
  platformSpend: number;
  platformReportedConversions: number;
  platformReportedValue: number;
  matchedStrong: number;
  matchedMedium: number;
  matchedWeak: number;
  siteTouched: boolean;
  platformTouched: boolean;
  matchReason?: string | null;
};

type ReconciliationRow = Bucket & {
  matchStatus: "matched" | "platform_only" | "site_only" | "unknown";
  actualRoas: number | null;
  platformRoas: number | null;
  conversionGap: number;
  valueGap: number;
};

type MarketingRecommendation = {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  type: "SCALE" | "PAUSE_OR_REVIEW" | "FIX_TRACKING" | "FIX_ATTRIBUTION" | "INVESTIGATE";
  title: string;
  details: string;
  action: string;
  rowKey?: string;
  campaignName?: string | null;
  adsetName?: string | null;
  adName?: string | null;
  metrics?: Record<string, number | string | null>;
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

function normalizeName(value: string | null | undefined): string | null {
  const normalized = value
    ?.normalize("NFKC")
    .toLowerCase()
    .replace(/[|_\-–—/\\]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return normalized || null;
}

function isMostlyNumericId(value: string | null | undefined): boolean {
  const clean = value?.trim();
  if (!clean) return false;
  return /^\d{8,}$/.test(clean) || /^[a-f0-9]{16,}$/i.test(clean);
}

function displayAdLabel(label: string | null | undefined, adId?: string | null) {
  const clean = label?.trim();
  if (!clean) return "إعلان بدون اسم";
  if (adId && clean === adId) return "إعلان بدون اسم";
  if (isMostlyNumericId(clean)) return "إعلان بدون اسم";
  return clean;
}

function tokenScore(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.82;
  const at = new Set(a.split(" ").filter((x) => x.length > 1));
  const bt = new Set(b.split(" ").filter((x) => x.length > 1));
  if (at.size === 0 || bt.size === 0) return 0;
  let shared = 0;
  for (const t of at) if (bt.has(t)) shared += 1;
  return shared / Math.max(at.size, bt.size);
}

function indexName(index: Map<string, string>, bucket: Bucket, ...names: Array<string | null | undefined>) {
  for (const name of names) {
    const n = normalizeName(name);
    if (!n) continue;
    if (!index.has(n)) index.set(n, bucket.key);
  }
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

function adsetNameFromAttribution(attribution: unknown) {
  return stringValue(attribution, "adset_name")
    || stringValue(attribution, "ad_group_name")
    || stringValue(attribution, "utm_term");
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
      adsetName: null,
      adId: null,
      siteDonations: 0,
      siteRevenue: 0,
      platformSpend: 0,
      platformReportedConversions: 0,
      platformReportedValue: 0,
      matchedStrong: 0,
      matchedMedium: 0,
      matchedWeak: 0,
      siteTouched: false,
      platformTouched: false,
      matchReason: null,
    };
    map.set(key, row);
  }
  return row;
}

function findBestBucketByName(buckets: Map<string, Bucket>, nameIndex: Map<string, string>, ...names: Array<string | null | undefined>): { bucket: Bucket | null; reason: string | null } {
  for (const name of names) {
    const n = normalizeName(name);
    if (!n) continue;
    const exactKey = nameIndex.get(n);
    if (exactKey) return { bucket: buckets.get(exactKey) ?? null, reason: "name_exact" };
  }

  let best: { bucket: Bucket; score: number } | null = null;
  const normalizedCandidates = names.map(normalizeName).filter(Boolean) as string[];
  for (const bucket of buckets.values()) {
    if (!bucket.siteTouched) continue;
    const bucketNames = [bucket.label, bucket.campaignName, bucket.campaignId, bucket.adId].map(normalizeName).filter(Boolean) as string[];
    for (const a of normalizedCandidates) {
      for (const b of bucketNames) {
        const score = tokenScore(a, b);
        if (score >= 0.72 && (!best || score > best.score)) best = { bucket, score };
      }
    }
  }
  return best ? { bucket: best.bucket, reason: `name_similarity_${best.score.toFixed(2)}` } : { bucket: null, reason: null };
}

function findBucketForPlatformSnapshot(
  buckets: Map<string, Bucket>,
  nameIndex: Map<string, string>,
  snapshot: { adId?: string | null; campaignId?: string | null; campaignName?: string | null; adName?: string | null },
  fallbackKey: string,
  fallbackLabel: string,
): { bucket: Bucket; reason: string } {
  if (snapshot.adId) {
    const directAd = buckets.get(`ad:${snapshot.adId}`);
    if (directAd) return { bucket: directAd, reason: "ad_id" };
  }
  if (snapshot.campaignId) {
    const directCampaign = buckets.get(`campaign:${snapshot.campaignId}`);
    if (directCampaign) return { bucket: directCampaign, reason: "campaign_id" };
  }
  const byName = findBestBucketByName(buckets, nameIndex, snapshot.adName, snapshot.campaignName);
  if (byName.bucket) return { bucket: byName.bucket, reason: byName.reason ?? "name" };
  return { bucket: ensureBucket(buckets, fallbackKey, fallbackLabel), reason: "platform_only" };
}

function buildStructuredRecommendations(rows: ReconciliationRow[], summary: { platformSpend: number; siteRevenue: number; weakAttribution: number; unmatchedSiteRows: number; unmatchedPlatformRows: number; cApiMarkedSent: number; paidDonations: number; countryMismatchCount: number }): MarketingRecommendation[] {
  const recs: MarketingRecommendation[] = [];
  const spendRows = rows.filter((row) => row.platformSpend > 0);
  const matchedRows = spendRows.filter((row) => row.matchStatus === "matched");
  const platformOnly = spendRows.filter((row) => row.matchStatus === "platform_only");
  const siteOnly = rows.filter((row) => row.matchStatus === "site_only" && row.siteRevenue > 0);

  const bestScale = matchedRows
    .filter((row) => (row.actualRoas ?? 0) >= 3 && row.siteDonations >= 2)
    .sort((a, b) => (b.actualRoas ?? 0) - (a.actualRoas ?? 0))[0];
  if (bestScale) {
    recs.push({
      id: `scale:${bestScale.key}`,
      priority: "HIGH",
      type: "SCALE",
      title: `زد الميزانية تدريجيًا: ${bestScale.campaignName || bestScale.label}`,
      details: `ROAS الحقيقي ${bestScale.actualRoas?.toFixed(2)} مع ${bestScale.siteDonations} تبرعات فعلية. هذا قرار مبني على الموقع لا على أرقام المنصة فقط.`,
      action: "ارفع الميزانية 15% إلى 25% لمدة يومين ثم راقب ROAS الحقيقي والتبرعات الفعلية.",
      rowKey: bestScale.key,
      campaignName: bestScale.campaignName,
      adsetName: bestScale.adsetName,
      adName: bestScale.label,
      metrics: { actualRoas: bestScale.actualRoas, siteDonations: bestScale.siteDonations, siteRevenue: bestScale.siteRevenue, platformSpend: bestScale.platformSpend },
    });
  }

  const waste = spendRows
    .filter((row) => row.platformSpend >= 10 && row.siteDonations === 0)
    .sort((a, b) => b.platformSpend - a.platformSpend)[0];
  if (waste) {
    recs.push({
      id: `waste:${waste.key}`,
      priority: "HIGH",
      type: "PAUSE_OR_REVIEW",
      title: `راجع أو أوقف مؤقتًا: ${waste.campaignName || waste.label}`,
      details: `يوجد صرف ${waste.platformSpend.toFixed(2)} بدون أي تبرعات فعلية من الموقع في الفترة المختارة.`,
      action: "راجع الاستهداف، الإعلان، صفحة الهبوط، والرابط. إن لم يظهر تحسن خلال 24 ساعة أوقف المجموعة أو خفّض الميزانية.",
      rowKey: waste.key,
      campaignName: waste.campaignName,
      adsetName: waste.adsetName,
      adName: waste.label,
      metrics: { platformSpend: waste.platformSpend, siteDonations: waste.siteDonations, siteRevenue: waste.siteRevenue },
    });
  }

  if (platformOnly.length > 0) {
    const top = platformOnly.sort((a, b) => b.platformSpend - a.platformSpend)[0];
    recs.push({
      id: `platform-only:${top.key}`,
      priority: "MEDIUM",
      type: "FIX_ATTRIBUTION",
      title: "بيانات منصة بدون ربط واضح بتبرعات الموقع",
      details: `${platformOnly.length} صفوف من المنصة لا تقابلها تبرعات موقع. أعلى صف: ${top.campaignName || top.label}.`,
      action: "استخدم روابط Campaign Builder وتأكد من utm_campaign وcampaign_id وad_id في روابط الإعلانات القادمة.",
      rowKey: top.key,
      campaignName: top.campaignName,
      adsetName: top.adsetName,
      adName: top.label,
      metrics: { rows: platformOnly.length, topSpend: top.platformSpend },
    });
  }

  if (siteOnly.length > 0) {
    const top = siteOnly.sort((a, b) => b.siteRevenue - a.siteRevenue)[0];
    recs.push({
      id: `site-only:${top.key}`,
      priority: "MEDIUM",
      type: "FIX_ATTRIBUTION",
      title: "تبرعات فعلية غير مربوطة بصرف المنصة",
      details: `${siteOnly.length} صفوف من الموقع لا تقابلها بيانات صرف. أعلى صف حقق ${top.siteRevenue.toFixed(2)} إيراد.`,
      action: "راجع مصدر هذه التبرعات: إن كانت من إعلانات، اربط الروابط بـ UTM/IDs. وإن كانت عضوية فصنّفها ك Organic/Direct بوضوح.",
      rowKey: top.key,
      campaignName: top.campaignName,
      adsetName: top.adsetName,
      adName: top.label,
      metrics: { rows: siteOnly.length, topRevenue: top.siteRevenue },
    });
  }

  if (summary.weakAttribution > 0) {
    recs.push({
      id: "weak-attribution",
      priority: summary.weakAttribution >= 5 ? "HIGH" : "MEDIUM",
      type: "FIX_ATTRIBUTION",
      title: "إسناد ضعيف في روابط التبرع",
      details: `يوجد ${summary.weakAttribution} تبرع بإسناد ضعيف خلال الفترة. هذا يقلل دقة معرفة مصدر التبرع.`,
      action: "اجعل كل روابط الإعلانات تمر من Campaign Builder وتحتوي على utm_source/utm_campaign/campaign_id/ad_id قدر الإمكان.",
      metrics: { weakAttribution: summary.weakAttribution },
    });
  }

  if (summary.cApiMarkedSent < summary.paidDonations) {
    recs.push({
      id: "missing-capi",
      priority: "HIGH",
      type: "FIX_TRACKING",
      title: "بعض التبرعات لم تُوسم كمرسلة CAPI",
      details: `الموسوم كمرسل: ${summary.cApiMarkedSent} من أصل ${summary.paidDonations} تبرع مدفوع.`,
      action: "افتح أحداث التحويل واستخدم Timeline التبرع لمعرفة التبرعات الفاشلة ثم أعد المحاولة بعد إصلاح سبب الخطأ.",
      metrics: { sent: summary.cApiMarkedSent, paid: summary.paidDonations },
    });
  }

  if (summary.countryMismatchCount > 0) {
    recs.push({
      id: "country-mismatch",
      priority: "LOW",
      type: "INVESTIGATE",
      title: "اختلاف بين دولة الرابط/الإعلان ودولة المتبرع",
      details: `يوجد ${summary.countryMismatchCount} حالات اختلاف دولة. هذا ليس خطأ دائمًا، لكنه مهم عند تقييم الاستهداف.`,
      action: "لا تعتمد على دولة وسيلة الدفع وحدها. قارن الدولة المستهدفة، IP، بلد المتبرع، وبلد البطاقة قبل تغيير الاستهداف.",
      metrics: { countryMismatchCount: summary.countryMismatchCount },
    });
  }

  if (summary.platformSpend > 0 && summary.siteRevenue / summary.platformSpend < 1) {
    recs.push({
      id: "low-overall-roas",
      priority: "HIGH",
      type: "PAUSE_OR_REVIEW",
      title: "ROAS الحقيقي العام أقل من 1",
      details: `الإيراد الفعلي أقل من الصرف خلال الفترة المختارة.`,
      action: "خفض الميزانيات ذات ROAS ضعيف، ووجّه الاختبار نحو الحملات ذات تبرعات فعلية مثبتة.",
      metrics: { actualRoas: summary.siteRevenue / summary.platformSpend, platformSpend: summary.platformSpend, siteRevenue: summary.siteRevenue },
    });
  }

  return recs.slice(0, 8);
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
    select: { id: true, amount: true, amountUSD: true, currency: true, paidAt: true, donorCountryCode: true, attribution: true, conversionEventsSentAt: true },
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
    select: { adId: true, adName: true, campaignId: true, campaignName: true, adGroupId: true, adGroupName: true, spend: true, reportedConversions: true, reportedConversionValue: true, country: true, currency: true },
    take: 5000,
  });

  const buckets = new Map<string, Bucket>();
  const nameIndex = new Map<string, string>();
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
    bucket.siteTouched = true;
    bucket.siteDonations += 1;
    bucket.siteRevenue += amount;
    bucket.source ||= stringValue(attribution, "utm_source") || stringValue(attribution, "channel");
    bucket.campaignId ||= stringValue(attribution, "campaign_id") || stringValue(attribution, "utm_id");
    bucket.campaignName ||= stringValue(attribution, "utm_campaign") || stringValue(attribution, "campaign_name");
    bucket.adsetId ||= stringValue(attribution, "adset_id") || stringValue(attribution, "ad_group_id");
    bucket.adsetName ||= adsetNameFromAttribution(attribution);
    bucket.adId ||= stringValue(attribution, "ad_id");
    indexName(nameIndex, bucket, bucket.label, bucket.campaignName, bucket.campaignId, bucket.adId);

    const quality = attributionQuality(attribution);
    if (quality === "strong") { strongAttribution += 1; bucket.matchedStrong += 1; }
    else if (quality === "medium") { mediumAttribution += 1; bucket.matchedMedium += 1; }
    else { weakAttribution += 1; bucket.matchedWeak += 1; }

    const adCountry = normalizedCountry(stringValue(attribution, "target_country") || stringValue(attribution, "ad_country") || stringValue(attribution, "country"));
    const donorCountry = normalizedCountry(donation.donorCountryCode || stringValue(attribution, "donor_country") || stringValue(attribution, "billing_country"));
    if (adCountry && donorCountry && adCountry !== donorCountry) {
      countryMismatches.push({ donationId: donation.id, amount, currency: donation.currency, adCountry, donorCountry, source: bucket.source, campaign: bucket.campaignName ?? bucket.campaignId, adId: bucket.adId });
    }
  }

  let platformSpend = 0;
  let platformConversions = 0;
  let platformValue = 0;
  for (const snap of campaignSnapshots) {
    platformSpend += snap.spend || 0;
    platformConversions += snap.reportedConversions || 0;
    platformValue += snap.reportedConversionValue || 0;
    const { bucket, reason } = findBucketForPlatformSnapshot(
      buckets,
      nameIndex,
      { campaignId: snap.campaignId, campaignName: snap.campaignName },
      `campaign:${snap.campaignId}`,
      snap.campaignName || snap.campaignId,
    );
    bucket.platformTouched = true;
    bucket.matchReason ||= reason;
    bucket.campaignId ||= snap.campaignId;
    bucket.campaignName ||= snap.campaignName;
    bucket.platformSpend += snap.spend || 0;
    bucket.platformReportedConversions += snap.reportedConversions || 0;
    bucket.platformReportedValue += snap.reportedConversionValue || 0;
    indexName(nameIndex, bucket, bucket.label, bucket.campaignName, snap.campaignName);
  }

  for (const snap of adSnapshots) {
    const adName = displayAdLabel(snap.adName, snap.adId);
    const { bucket, reason } = findBucketForPlatformSnapshot(
      buckets,
      nameIndex,
      { adId: snap.adId, adName, campaignId: snap.campaignId, campaignName: snap.campaignName },
      `ad:${snap.adId}`,
      adName,
    );
    bucket.platformTouched = true;
    bucket.matchReason ||= reason;
    bucket.label = displayAdLabel(bucket.label, bucket.adId || snap.adId);
    bucket.adId ||= snap.adId;
    bucket.campaignId ||= snap.campaignId;
    bucket.campaignName ||= snap.campaignName;
    bucket.adsetId ||= snap.adGroupName ? null : snap.adGroupId;
    bucket.adsetName ||= snap.adGroupName || snap.adGroupId;
    bucket.platformSpend += snap.spend || 0;
    bucket.platformReportedConversions += snap.reportedConversions || 0;
    bucket.platformReportedValue += snap.reportedConversionValue || 0;
    indexName(nameIndex, bucket, bucket.label, bucket.campaignName, snap.campaignName, adName, snap.adGroupName);
  }

  const rows = [...buckets.values()].map((row): ReconciliationRow => ({
    ...row,
    label: displayAdLabel(row.label, row.adId),
    adsetId: row.adsetName ? null : row.adsetId,
    matchStatus: row.siteTouched && row.platformTouched ? "matched" : row.platformTouched ? "platform_only" : row.siteTouched ? "site_only" : "unknown",
    actualRoas: row.platformSpend > 0 ? row.siteRevenue / row.platformSpend : null,
    platformRoas: row.platformSpend > 0 ? row.platformReportedValue / row.platformSpend : null,
    conversionGap: row.siteDonations - row.platformReportedConversions,
    valueGap: row.siteRevenue - row.platformReportedValue,
  })).sort((a, b) => Math.max(b.siteRevenue, b.platformReportedValue, b.platformSpend) - Math.max(a.siteRevenue, a.platformReportedValue, a.platformSpend)).slice(0, 100);

  const unmatchedSiteRows = rows.filter((r) => r.matchStatus === "site_only").length;
  const unmatchedPlatformRows = rows.filter((r) => r.matchStatus === "platform_only").length;
  const recommendations: string[] = [];
  if (platformSpend > 0 && paidRevenue === 0) recommendations.push("يوجد إنفاق منصات بدون تبرعات فعلية في الموقع خلال الفترة؛ راجع الحملات/الدول الأعلى إنفاقًا.");
  if (weakAttribution > 0) recommendations.push(`يوجد ${weakAttribution} تبرع بإسناد ضعيف؛ راجع روابط UTM و fbclid/fbc.`);
  if (unmatchedSiteRows > 0 || unmatchedPlatformRows > 0) recommendations.push(`توجد صفوف غير مطابقة: ${unmatchedSiteRows} من الموقع فقط و ${unmatchedPlatformRows} من المنصة فقط؛ راجع أسماء الحملات و UTM/IDs.`);
  if (countryMismatches.length > 0) recommendations.push(`يوجد ${countryMismatches.length} اختلاف دولة بين الإعلان/الرابط ودولة المتبرع؛ لا تعتبره خطأ مباشرًا لكن راجعه في الاستهداف والدفع.`);
  if (platformConversions > donations.length * 1.4 && donations.length > 0) recommendations.push("نتائج المنصة أعلى بكثير من التبرعات الفعلية؛ راجع attribution window و view-through conversions.");
  if (cApiMarkedSent < donations.length) recommendations.push("بعض التبرعات المدفوعة ليست موسومة كمرسلة CAPI؛ شغّل مراجعة التحويلات المفقودة.");
  const structuredRecommendations = buildStructuredRecommendations(rows, { platformSpend, siteRevenue: paidRevenue, weakAttribution, unmatchedSiteRows, unmatchedPlatformRows, cApiMarkedSent, paidDonations: donations.length, countryMismatchCount: countryMismatches.length });

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
      unmatchedSiteRows,
      unmatchedPlatformRows,
      matchedRows: rows.filter((r) => r.matchStatus === "matched").length,
    },
    rows,
    countryMismatches: countryMismatches.slice(0, 100),
    recommendations,
    structuredRecommendations,
  });
}
