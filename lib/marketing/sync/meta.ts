import type {
  SyncAdGroupSnapshot,
  SyncAdSnapshot,
  SyncCampaignSnapshot,
  SyncClient,
  SyncClientResult,
} from "./types";
import { missingConfigResult } from "./types";

const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type MetaInsightRow = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function cleanAccountId(accountId: string): string {
  const id = accountId.trim();
  return id.startsWith("act_") ? id : `act_${id}`;
}

function metricFromActions(row: MetaInsightRow, keys: string[]): number {
  const actions = row.actions;
  if (!Array.isArray(actions)) return 0;
  let total = 0;
  for (const action of actions) {
    if (!action || typeof action !== "object") continue;
    const record = action as Record<string, unknown>;
    const type = asString(record.action_type)?.toLowerCase();
    if (!type || !keys.some((key) => type === key || type.includes(key))) continue;
    total += asNumber(record.value);
  }
  return total;
}

function valueFromActionValues(row: MetaInsightRow, keys: string[]): number {
  const values = row.action_values;
  if (!Array.isArray(values)) return 0;
  let total = 0;
  for (const action of values) {
    if (!action || typeof action !== "object") continue;
    const record = action as Record<string, unknown>;
    const type = asString(record.action_type)?.toLowerCase();
    if (!type || !keys.some((key) => type === key || type.includes(key))) continue;
    total += asNumber(record.value);
  }
  return total;
}

const CONVERSION_KEYS = ["donate", "purchase", "offsite_conversion", "complete_registration"];

function reportedConversions(row: MetaInsightRow): number {
  return metricFromActions(row, CONVERSION_KEYS);
}

function reportedConversionValue(row: MetaInsightRow): number {
  return valueFromActionValues(row, CONVERSION_KEYS);
}

async function graphGetAll(path: string, accessToken: string, params: Record<string, string>): Promise<MetaInsightRow[]> {
  const rows: MetaInsightRow[] = [];
  const url = new URL(`${BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", accessToken);

  let next: string | null = url.toString();
  while (next) {
    const res = await fetch(next, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { data?: MetaInsightRow[]; paging?: { next?: string }; error?: { message?: string; code?: number; type?: string } };
    if (!res.ok) {
      const msg = data.error?.message || `Meta API HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (Array.isArray(data.data)) rows.push(...data.data);
    next = data.paging?.next ?? null;
  }
  return rows;
}

function baseParams(dateFrom: Date, dateTo: Date, level: "campaign" | "adset" | "ad") {
  return {
    time_increment: "1",
    time_range: JSON.stringify({ since: dateKey(dateFrom), until: dateKey(dateTo) }),
    level,
    limit: "500",
    action_report_time: "conversion",
    fields: [
      "date_start",
      "date_stop",
      "account_currency",
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "ad_id",
      "ad_name",
      "objective",
      "impressions",
      "clicks",
      "spend",
      "ctr",
      "cpc",
      "cpm",
      "actions",
      "action_values",
    ].join(","),
  };
}

function toCampaign(row: MetaInsightRow): SyncCampaignSnapshot | null {
  const campaignId = asString(row.campaign_id);
  const date = asString(row.date_start);
  if (!campaignId || !date) return null;
  return {
    date: dayStart(date),
    campaignId,
    campaignName: asString(row.campaign_name),
    objective: asString(row.objective),
    spend: asNumber(row.spend),
    impressions: Math.round(asNumber(row.impressions)),
    clicks: Math.round(asNumber(row.clicks)),
    ctr: asNumber(row.ctr) || null,
    cpc: asNumber(row.cpc) || null,
    cpm: asNumber(row.cpm) || null,
    reportedConversions: reportedConversions(row),
    reportedConversionValue: reportedConversionValue(row),
    currency: asString(row.account_currency),
    raw: row,
  };
}

function toAdGroup(row: MetaInsightRow): SyncAdGroupSnapshot | null {
  const adGroupId = asString(row.adset_id);
  const date = asString(row.date_start);
  if (!adGroupId || !date) return null;
  return {
    date: dayStart(date),
    campaignId: asString(row.campaign_id),
    campaignName: asString(row.campaign_name),
    adGroupId,
    adGroupName: asString(row.adset_name),
    country: asString(row.country),
    placement: asString(row.publisher_platform),
    spend: asNumber(row.spend),
    impressions: Math.round(asNumber(row.impressions)),
    clicks: Math.round(asNumber(row.clicks)),
    reportedConversions: reportedConversions(row),
    reportedConversionValue: reportedConversionValue(row),
    currency: asString(row.account_currency),
    raw: row,
  };
}

function toAd(row: MetaInsightRow): SyncAdSnapshot | null {
  const adId = asString(row.ad_id);
  const date = asString(row.date_start);
  if (!adId || !date) return null;
  return {
    date: dayStart(date),
    campaignId: asString(row.campaign_id),
    campaignName: asString(row.campaign_name),
    adGroupId: asString(row.adset_id),
    adGroupName: asString(row.adset_name),
    adId,
    adName: asString(row.ad_name),
    country: asString(row.country),
    placement: asString(row.publisher_platform),
    spend: asNumber(row.spend),
    impressions: Math.round(asNumber(row.impressions)),
    clicks: Math.round(asNumber(row.clicks)),
    reportedConversions: reportedConversions(row),
    reportedConversionValue: reportedConversionValue(row),
    currency: asString(row.account_currency),
    raw: row,
  };
}

export const syncMeta: SyncClient = async ({ connection, dateFrom, dateTo }): Promise<SyncClientResult> => {
  const missing: string[] = [];
  if (!connection.accountId) missing.push("accountId");
  if (!connection.accessToken) missing.push("accessToken");
  if (missing.length > 0) {
    return missingConfigResult(missing, "ناقص بيانات Meta — أكمل Ad Account ID و Access Token.");
  }

  try {
    const account = cleanAccountId(connection.accountId!);
    const accessToken = connection.accessToken!;
    const campaignRows = await graphGetAll(`${account}/insights`, accessToken, baseParams(dateFrom, dateTo, "campaign"));
    const adsetRows = await graphGetAll(`${account}/insights`, accessToken, {
      ...baseParams(dateFrom, dateTo, "adset"),
      breakdowns: "country,publisher_platform",
    });
    const adRows = await graphGetAll(`${account}/insights`, accessToken, {
      ...baseParams(dateFrom, dateTo, "ad"),
      breakdowns: "country,publisher_platform",
    });

    const campaigns = campaignRows.map(toCampaign).filter(Boolean) as SyncCampaignSnapshot[];
    const adGroups = adsetRows.map(toAdGroup).filter(Boolean) as SyncAdGroupSnapshot[];
    const ads = adRows.map(toAd).filter(Boolean) as SyncAdSnapshot[];
    const rowsFetched = campaigns.length + adGroups.length + ads.length;

    return {
      status: "SUCCESS",
      rowsFetched,
      message: `تمت مزامنة Meta Insights: ${campaigns.length} حملة، ${adGroups.length} مجموعة، ${ads.length} إعلان.`,
      snapshots: { campaigns, adGroups, ads },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta API sync failed";
    return {
      status: "FAILED",
      rowsFetched: 0,
      message: "فشلت مزامنة Meta Insights API.",
      error: message.slice(0, 240),
    };
  }
};
