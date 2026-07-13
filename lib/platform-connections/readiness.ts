import { prisma } from "@/lib/prisma";
import { getRawTrackingSettings, trackingString } from "@/lib/tracking/tracking-settings";
import { getSchedulerStatus, type SchedulerStatus } from "@/lib/communication/scheduler-status";

/**
 * Read-only readiness aggregation for the «ربط المنصات والإرسال» section.
 *
 * This module ONLY reads existing data (TrackingSettings, MarketingPlatformConnection,
 * PlatformSyncRun, CommunicationSender, CommunicationProviderEvent) and existing services. It never
 * writes, never sends, never changes tracking/dispatch behavior, and never returns a secret value —
 * only presence booleans, human statuses, dates, and safe reason labels.
 */

export type ConnStatus = "READY" | "NEEDS_SETUP" | "FAILED" | "DISABLED";

export const STATUS_LABEL: Record<ConnStatus, string> = {
  READY: "جاهز",
  NEEDS_SETUP: "يحتاج إعداد",
  FAILED: "فشل آخر اختبار",
  DISABLED: "غير مفعّل",
};

export const STATUS_CLASS: Record<ConnStatus, string> = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_SETUP: "border-amber-200 bg-amber-50 text-amber-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  DISABLED: "border-slate-200 bg-slate-100 text-slate-600",
};

const env = (k: string) => !!process.env[k]?.trim();
const hasDb = () => !!process.env.DATABASE_URL;

// ─────────────────────────── Tracking / Pixels ───────────────────────────

export type PixelRow = {
  key: string;
  label: string;
  configured: boolean;
  browser: boolean;
  server: boolean;
  status: ConnStatus;
  note?: string;
};

export type TrackingReadiness = {
  status: ConnStatus;
  configuredCount: number;
  total: number;
  rows: PixelRow[];
};

export async function getTrackingReadiness(): Promise<TrackingReadiness> {
  const row = hasDb() ? await getRawTrackingSettings().catch(() => null) : null;
  const s = (k: string) => !!trackingString(row, k);

  const metaPixel = s("facebookPixelId") || env("META_PIXEL_ID");
  const metaCapi = s("facebookAccessToken") || env("META_ACCESS_TOKEN");
  const tiktokPixel = s("tiktokPixelId");
  const tiktokApi = s("tiktokAccessToken");
  const gaTag = s("gaMeasurementId") || env("GA4_MEASUREMENT_ID");
  const ga4Server = (s("gaMeasurementId") || env("GA4_MEASUREMENT_ID")) && (s("gaApiSecret") || env("GA4_API_SECRET"));
  const googleAds = s("googleAdsConversionId");
  const xPixel = s("xPixelId");

  const st = (ok: boolean): ConnStatus => (ok ? "READY" : "NEEDS_SETUP");
  const rows: PixelRow[] = [
    { key: "meta_pixel", label: "Meta Pixel", configured: metaPixel, browser: true, server: false, status: st(metaPixel) },
    { key: "meta_capi", label: "Meta Conversions API", configured: metaCapi, browser: false, server: true, status: st(metaCapi) },
    { key: "tiktok_pixel", label: "TikTok Pixel", configured: tiktokPixel, browser: true, server: false, status: st(tiktokPixel) },
    { key: "tiktok_api", label: "TikTok Events API", configured: tiktokApi, browser: false, server: true, status: st(tiktokApi) },
    { key: "google_tag", label: "Google Tag", configured: gaTag, browser: true, server: false, status: st(gaTag) },
    { key: "ga4", label: "GA4", configured: !!ga4Server, browser: true, server: true, status: st(!!ga4Server) },
    { key: "google_ads", label: "Google Ads Conversion", configured: googleAds, browser: false, server: true, status: st(googleAds) },
    { key: "x_pixel", label: "X Pixel", configured: xPixel, browser: true, server: false, status: st(xPixel) },
  ];
  const configuredCount = rows.filter((r) => r.configured).length;
  // Card is "ready" once the primary donation pixel + its server backup are configured.
  const status: ConnStatus = metaPixel && metaCapi ? "READY" : configuredCount > 0 ? "NEEDS_SETUP" : "NEEDS_SETUP";
  return { status, configuredCount, total: rows.length, rows };
}

// ─────────────────────────── Ad Accounts ───────────────────────────

const AD_PLATFORMS: { key: string; label: string; aliases: string[] }[] = [
  { key: "META", label: "Meta Ads", aliases: ["META", "FACEBOOK"] },
  { key: "GOOGLE_ADS", label: "Google Ads", aliases: ["GOOGLE_ADS"] },
  { key: "TIKTOK", label: "TikTok Ads", aliases: ["TIKTOK"] },
  { key: "X", label: "X Ads", aliases: ["X", "X_ADS", "TWITTER"] },
];

export type AdAccountRow = {
  key: string;
  label: string;
  connected: boolean;
  enabled: boolean;
  status: ConnStatus;
  completionPercent: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
};

export type AdAccountsReadiness = { status: ConnStatus; connectedCount: number; rows: AdAccountRow[] };

function mapConnectionStatus(connStatus: string | null, enabled: boolean, percent: number): ConnStatus {
  if (!enabled) return "DISABLED";
  if (connStatus && ["AUTH_ERROR", "PERMISSION_ERROR", "SYNC_ERROR"].includes(connStatus)) return "FAILED";
  if (connStatus === "ACTIVE" && percent >= 100) return "READY";
  return "NEEDS_SETUP";
}

export async function getAdAccountsReadiness(): Promise<AdAccountsReadiness> {
  const rows: AdAccountRow[] = [];
  let connections: Array<{ platform: string; enabled: boolean; status: string; lastSyncAt: Date | null; lastError: string | null; configChecklist: unknown }> = [];
  let syncRuns: Array<{ platform: string; status: string; startedAt: Date; error: string | null }> = [];
  if (hasDb()) {
    connections = (await prisma.marketingPlatformConnection
      .findMany({ where: { category: "ADS" }, select: { platform: true, enabled: true, status: true, lastSyncAt: true, lastError: true, configChecklist: true } })
      .catch(() => [])) as typeof connections;
    syncRuns = (await prisma.platformSyncRun
      .findMany({ orderBy: { startedAt: "desc" }, take: 40, select: { platform: true, status: true, startedAt: true, error: true } })
      .catch(() => [])) as typeof syncRuns;
  }

  for (const p of AD_PLATFORMS) {
    const conns = connections.filter((c) => p.aliases.includes((c.platform || "").toUpperCase()));
    const enabled = conns.some((c) => c.enabled);
    const connected = conns.length > 0;
    const percent = Math.max(0, ...conns.map((c) => Number((c.configChecklist as { completionPercent?: number } | null)?.completionPercent ?? 0)));
    const primary = conns.find((c) => c.enabled) ?? conns[0];
    const lastRun = syncRuns.find((r) => p.aliases.includes((r.platform || "").toUpperCase()));
    const status: ConnStatus = connected ? mapConnectionStatus(primary?.status ?? null, enabled, percent) : "NEEDS_SETUP";
    rows.push({
      key: p.key,
      label: p.label,
      connected,
      enabled,
      status,
      completionPercent: percent,
      lastSyncAt: (lastRun?.startedAt ?? primary?.lastSyncAt)?.toISOString() ?? null,
      lastSyncStatus: lastRun?.status ?? null,
      lastError: primary?.lastError ?? lastRun?.error ?? null,
    });
  }
  const connectedCount = rows.filter((r) => r.connected).length;
  const anyReady = rows.some((r) => r.status === "READY");
  const anyFailed = rows.some((r) => r.status === "FAILED");
  const status: ConnStatus = anyReady ? "READY" : anyFailed ? "FAILED" : connectedCount > 0 ? "NEEDS_SETUP" : "NEEDS_SETUP";
  return { status, connectedCount, rows };
}

// ─────────────────────────── Communication ───────────────────────────

export type CommunicationReadiness = {
  status: ConnStatus;
  whatsapp: { status: ConnStatus; sendersWithNumber: number; sendersMissingNumber: number };
  email: { status: ConnStatus; envConfigured: boolean; enabledSenders: number };
  sms: { status: ConnStatus };
  routingRules: number;
  scheduler: SchedulerStatus;
};

export async function getCommunicationReadiness(): Promise<CommunicationReadiness> {
  const waEnv = env("META_WHATSAPP_ACCESS_TOKEN") && env("META_WHATSAPP_BUSINESS_ACCOUNT_ID");
  const emailEnv = env("SENDGRID_API_KEY");

  let sendersWithNumber = 0;
  let sendersMissingNumber = 0;
  let enabledEmailSenders = 0;
  let routingRules = 0;
  if (hasDb()) {
    sendersWithNumber = await prisma.communicationSender.count({ where: { channel: "WHATSAPP", phoneNumberId: { not: null } } }).catch(() => 0);
    sendersMissingNumber = await prisma.communicationSender.count({ where: { channel: "WHATSAPP", phoneNumberId: null } }).catch(() => 0);
    enabledEmailSenders = await prisma.communicationSender.count({ where: { channel: "EMAIL", enabled: true } }).catch(() => 0);
    routingRules = await prisma.senderRoutingRule.count().catch(() => 0);
  }

  const waStatus: ConnStatus = waEnv && sendersWithNumber > 0 ? "READY" : "NEEDS_SETUP";
  const emailStatus: ConnStatus = emailEnv || enabledEmailSenders > 0 ? "READY" : "NEEDS_SETUP";
  const smsStatus: ConnStatus = "DISABLED";
  const scheduler = await getSchedulerStatus().catch(() => ({ configured: false, scheduledCount: 0, dueCount: 0, lastRunAt: null }));

  const status: ConnStatus = waStatus === "READY" || emailStatus === "READY" ? "READY" : "NEEDS_SETUP";
  return {
    status,
    whatsapp: { status: waStatus, sendersWithNumber, sendersMissingNumber },
    email: { status: emailStatus, envConfigured: emailEnv, enabledSenders: enabledEmailSenders },
    sms: { status: smsStatus },
    routingRules,
    scheduler,
  };
}

// ─────────────────────────── Webhooks ───────────────────────────

export const WHATSAPP_WEBHOOK_PATH = "/api/webhooks/meta/whatsapp";

export type WebhooksReadiness = {
  status: ConnStatus;
  webhookPath: string;
  signatureConfigured: boolean;
  lastWebhookAt: string | null;
  scheduler: SchedulerStatus;
};

export async function getWebhooksReadiness(): Promise<WebhooksReadiness> {
  const signatureConfigured = env("META_WHATSAPP_APP_SECRET");
  let lastWebhookAt: string | null = null;
  if (hasDb()) {
    const ev = await prisma.communicationProviderEvent
      .findFirst({ where: { channel: "WHATSAPP" }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } })
      .catch(() => null);
    lastWebhookAt = ev?.receivedAt ? ev.receivedAt.toISOString() : null;
  }
  const scheduler = await getSchedulerStatus().catch(() => ({ configured: false, scheduledCount: 0, dueCount: 0, lastRunAt: null }));
  const status: ConnStatus = signatureConfigured ? "READY" : "NEEDS_SETUP";
  return { status, webhookPath: WHATSAPP_WEBHOOK_PATH, signatureConfigured, lastWebhookAt, scheduler };
}

// ─────────────────────────── Overview aggregation ───────────────────────────

export type OverviewIssue = { title: string; severity: ConnStatus; href: string; action: string };

export async function getOverview() {
  const [tracking, ads, comm, webhooks] = await Promise.all([
    getTrackingReadiness(),
    getAdAccountsReadiness(),
    getCommunicationReadiness(),
    getWebhooksReadiness(),
  ]);

  const issues: OverviewIssue[] = [];
  const base = "/dashboard/platform-connections";
  // Real, data-derived issues only — no placeholders.
  if (!tracking.rows.find((r) => r.key === "meta_pixel")?.configured)
    issues.push({ title: "بكسل ميتا غير مُعد", severity: "NEEDS_SETUP", href: `${base}/tracking`, action: "إعداد" });
  if (!tracking.rows.find((r) => r.key === "meta_capi")?.configured)
    issues.push({ title: "Meta Conversions API غير مُعد", severity: "NEEDS_SETUP", href: `${base}/tracking`, action: "إعداد" });
  for (const a of ads.rows) {
    if (a.status === "FAILED") issues.push({ title: `فشل آخر مزامنة: ${a.label}`, severity: "FAILED", href: `${base}/ad-accounts`, action: "مراجعة" });
  }
  if (ads.connectedCount === 0) {
    issues.push({ title: "لا توجد حسابات إعلانية مربوطة", severity: "NEEDS_SETUP", href: `${base}/ad-accounts`, action: "ربط" });
  } else {
    // Partially connected — surface the specific platforms that still need setup (e.g. Google Ads, TikTok).
    for (const a of ads.rows) {
      if (a.connected && a.status === "NEEDS_SETUP")
        issues.push({ title: `${a.label} يحتاج إعداد`, severity: "NEEDS_SETUP", href: `${base}/ad-accounts`, action: "إعداد" });
    }
  }
  if (comm.whatsapp.status !== "READY")
    issues.push({ title: "إعداد واتساب غير مكتمل", severity: "NEEDS_SETUP", href: `${base}/communication`, action: "إعداد" });
  if (comm.whatsapp.sendersMissingNumber > 0)
    issues.push({ title: "يوجد مُرسِل واتساب بلا رقم مُعرّف", severity: "NEEDS_SETUP", href: `${base}/communication`, action: "مراجعة" });
  if (!webhooks.signatureConfigured)
    issues.push({ title: "توقيع Webhook غير مفعّل", severity: "FAILED", href: `${base}/webhooks`, action: "تأمين" });
  if (comm.sms.status === "DISABLED")
    issues.push({ title: "الرسائل القصيرة غير مفعّلة", severity: "DISABLED", href: `${base}/communication`, action: "تفاصيل" });

  return { tracking, ads, comm, webhooks, issues: issues.slice(0, 6) };
}
