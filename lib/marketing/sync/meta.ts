/**
 * Meta (Facebook / Instagram) Marketing API sync client.
 *
 * Phase: returns NOT_IMPLEMENTED until the real Graph API client lands.
 * Credential preflight runs first so the operator gets MISSING_CONFIG
 * with the exact missing fields instead of a generic "not implemented".
 */
import type { SyncClient, SyncClientResult } from "./types";
import { missingConfigResult, notImplementedResult } from "./types";

export const syncMeta: SyncClient = async ({ connection }) => {
  const missing: string[] = [];
  if (!connection.accountId) missing.push("accountId");
  if (!connection.accessToken) missing.push("accessToken");
  if (!connection.pixelId && !connection.datasetId) missing.push("pixelId|datasetId");
  if (missing.length > 0) {
    return missingConfigResult(
      missing,
      "ناقص بيانات Meta — أكمل Ad Account ID و Access Token و Pixel/Dataset."
    );
  }
  return notImplementedResult(
    "مزامنة Meta Insights API ستُفعّل في المرحلة التالية — كل البيانات المطلوبة متوفرة."
  );
};

export const meta: SyncClientResult = {
  status: "NOT_IMPLEMENTED",
  rowsFetched: 0,
  message: "stub",
};
