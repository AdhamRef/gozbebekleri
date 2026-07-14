import type { SafeIntegrationProviderSnapshot } from "./types";

export type IntegrationUiDrafts = Record<string, string>;

export function initializeIntegrationDrafts(snapshot: SafeIntegrationProviderSnapshot): IntegrationUiDrafts {
  return Object.fromEntries(snapshot.fields.map((field) => [field.key, field.isSecret ? "" : field.displayValue ?? ""]));
}

export function buildIntegrationSettingsPatch(
  snapshot: SafeIntegrationProviderSnapshot,
  drafts: IntegrationUiDrafts,
  dirtyKeys: ReadonlySet<string>
): { settings: { key: string; value: string }[] } {
  return {
    settings: snapshot.fields
      .filter((field) => dirtyKeys.has(field.key))
      .filter((field) => !field.isSecret || (drafts[field.key] ?? "").length > 0)
      .map((field) => ({ key: field.key, value: drafts[field.key] ?? "" })),
  };
}

export function providerConnectionTestBody(): Record<string, never> {
  return {};
}

export function providerCandidateBody(candidateVersion: string): { candidateVersion: string } {
  return { candidateVersion };
}

export function payloadContainsSecret(payload: unknown, secretValues: readonly string[]): boolean {
  const serialized = JSON.stringify(payload);
  return secretValues.some((value) => !!value && serialized.includes(value));
}
