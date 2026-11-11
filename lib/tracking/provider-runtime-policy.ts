/**
 * Provider IDs are configuration, never executable snippets. Legacy IDs keep
 * current runtime behavior only when a setting has not yet been persisted.
 * Once an operator explicitly disables a provider, legacy fallbacks stop.
 */
export const LEGACY_CLARITY_PROJECT_ID = "u614k028k2";
export const LEGACY_GTM_CONTAINER_ID = "GTM-MMNBQQWB";

export function validateClarityProjectId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return /^[a-z0-9]{5,32}$/i.test(id) ? id : null;
}
export function validateGtmContainerId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toUpperCase();
  return /^GTM-[A-Z0-9]{4,24}$/.test(id) ? id : null;
}
export type ProviderConfigRow = Record<string, unknown> | null;
export function runtimeProviderSettings(row: ProviderConfigRow) {
  const clarityHasId = row && Object.hasOwn(row, "clarityProjectId");
  const clarityHasEnabled = row && Object.hasOwn(row, "clarityEnabled");
  const gtmHasId = row && Object.hasOwn(row, "googleTagManagerId");
  const gtmHasEnabled = row && Object.hasOwn(row, "googleTagManagerEnabled");
  const legacyClarityId =
    validateClarityProjectId(process.env.NEXT_PUBLIC_CLARITY_ID) ?? LEGACY_CLARITY_PROJECT_ID;
  const clarityProjectId = validateClarityProjectId(
    clarityHasId ? row?.clarityProjectId : legacyClarityId);
  const clarityEnabled = clarityHasEnabled ? row?.clarityEnabled === true : true;
  const googleTagManagerId = validateGtmContainerId(
    gtmHasId ? row?.googleTagManagerId : LEGACY_GTM_CONTAINER_ID);
  const googleTagManagerEnabled = gtmHasEnabled ? row?.googleTagManagerEnabled === true : true;
  return {
    clarityProjectId,
    clarityEnabled: clarityEnabled && Boolean(clarityProjectId),
    googleTagManagerId,
    googleTagManagerEnabled: googleTagManagerEnabled && Boolean(googleTagManagerId),
  };
}
export function providerConfigurationStatus(enabled: boolean, id: string | null):
  "disabled" | "configured" | "unconfigured" {
  return !enabled ? "disabled" : id ? "configured" : "unconfigured";
}
