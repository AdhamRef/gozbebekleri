import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;
type Priority = "HIGH" | "MEDIUM" | "LOW";

type ActionItem = {
  id: string;
  priority: Priority;
  type: "LINK" | "CONVERSION" | "PLATFORM" | "SYSTEM";
  title: string;
  description: string;
  action: string;
  href: string;
};

function isMap(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function status(value: unknown) {
  return typeof value === "string" ? value.toUpperCase() : "ACTIVE";
}

function idOf(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (isMap(value) && typeof value.$oid === "string") return value.$oid;
  return fallback;
}

async function recentCampaignLinks() {
  const result = await prisma.$runCommandRaw({
    find: "MarketingCampaignLink",
    filter: { $or: [{ status: "ACTIVE" }, { status: { $exists: false } }, { status: null }] },
    sort: { updatedAt: -1, createdAt: -1 },
    limit: 100,
  }) as JsonMap;
  return isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isMap) : [];
}

async function recentConversionEvents() {
  const result = await prisma.$runCommandRaw({
    find: "ConversionEvent",
    sort: { updatedAt: -1, createdAt: -1 },
    limit: 100,
    projection: { request: 0, response: 0 },
  }) as JsonMap;
  return isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isMap) : [];
}

async function trackingSettings() {
  const result = await prisma.$runCommandRaw({ find: "TrackingSettings", limit: 1, sort: { createdAt: 1 } }) as JsonMap;
  const rows = isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch : [];
  return isMap(rows[0]) ? rows[0] : null;
}

function has(settings: JsonMap | null, key: string) {
  const value = settings?.[key];
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const [links, events, settings] = await Promise.all([
    recentCampaignLinks(),
    recentConversionEvents(),
    trackingSettings(),
  ]);

  const items: ActionItem[] = [];

  for (const [index, link] of links.entries()) {
    const id = idOf(link._id, `link-${index}`);
    const name = text(link.name) || text(link.utmCampaign) || text(link.campaignId) || "رابط تسويقي";
    const campaignId = text(link.campaignId) || text(link.utmId) || text(link.utmCampaign);
    const adId = text(link.adId);
    const platform = text(link.platform) || "UNKNOWN";

    if (!campaignId) {
      items.push({
        id: `link-missing-campaign-${id}`,
        priority: "HIGH",
        type: "LINK",
        title: `رابط بدون Campaign ID: ${name}`,
        description: `الرابط على منصة ${platform} لا يحتوي Campaign ID أو UTM Campaign كافٍ، وهذا يضعف ربط التبرعات بالحملة.`,
        action: "افتح الرابط واضغط تعديل، ثم أضف Campaign ID أو UTM Campaign.",
        href: "/dashboard/marketing-intelligence/campaign-links",
      });
    } else if (!adId && ["META", "GOOGLE_ADS", "TIKTOK", "X"].includes(platform.toUpperCase())) {
      items.push({
        id: `link-missing-ad-${id}`,
        priority: "MEDIUM",
        type: "LINK",
        title: `رابط يحتاج Ad ID: ${name}`,
        description: "الرابط يحتوي بيانات حملة لكنه لا يحتوي Ad ID، لذلك قد تكون المطابقة على مستوى الإعلان ضعيفة.",
        action: "أضف Ad ID أو استخدم متغيرات المنصة الديناميكية عند إنشاء الرابط.",
        href: "/dashboard/marketing-intelligence/campaign-links",
      });
    }
  }

  const failedEvents = events.filter((event) => status(event.status) === "FAILED").slice(0, 8);
  for (const [index, event] of failedEvents.entries()) {
    items.push({
      id: `failed-conversion-${idOf(event._id, String(index))}`,
      priority: "HIGH",
      type: "CONVERSION",
      title: `فشل تحويل ${text(event.platform) || "منصة"}`,
      description: `يوجد تحويل بحالة FAILED للحدث ${text(event.eventName) || "conversion"}.`,
      action: "افتح سجل التحويلات أو مركز إصلاح التحويلات لمعرفة السبب وإعادة المحاولة.",
      href: "/dashboard/conversion-events",
    });
  }

  const platforms = [
    { key: "META", label: "Meta", fields: ["facebookPixelId", "facebookAccessToken"] },
    { key: "GA4", label: "GA4", fields: ["gaMeasurementId", "gaApiSecret"] },
    { key: "GOOGLE_ADS", label: "Google Ads", fields: ["googleAdsConversionId", "googleAdsConversionLabel"] },
    { key: "TIKTOK", label: "TikTok", fields: ["tiktokPixelId"] },
    { key: "X", label: "X", fields: ["xPixelId"] },
  ];

  for (const platform of platforms) {
    const missing = platform.fields.filter((field) => !has(settings, field));
    if (missing.length) {
      items.push({
        id: `platform-missing-${platform.key}`,
        priority: platform.key === "META" ? "HIGH" : "MEDIUM",
        type: "PLATFORM",
        title: `${platform.label} غير مكتمل`,
        description: `ناقص: ${missing.join(", ")}`,
        action: "افتح إعدادات التتبع أو ربط المنصات وأكمل الإعدادات المطلوبة.",
        href: "/dashboard/marketing-intelligence/platform-status",
      });
    }
  }

  if (items.length === 0) {
    items.push({
      id: "system-ok",
      priority: "LOW",
      type: "SYSTEM",
      title: "لا توجد إجراءات عاجلة الآن",
      description: "الروابط الأساسية والتحويلات والمنصات لا تظهر مشاكل واضحة في آخر فحص.",
      action: "استمر في مراقبة الأداء بعد إطلاق الحملات الجديدة.",
      href: "/dashboard/marketing-intelligence",
    });
  }

  const weight: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  items.sort((a, b) => weight[b.priority] - weight[a.priority]);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      high: items.filter((item) => item.priority === "HIGH").length,
      medium: items.filter((item) => item.priority === "MEDIUM").length,
      low: items.filter((item) => item.priority === "LOW").length,
    },
    items: items.slice(0, 50),
  }, { headers: { "Cache-Control": "no-store" } });
}
