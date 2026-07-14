import type {
  IntegrationProvider,
  IntegrationTestResult,
  IntegrationValueSource,
} from "./catalog";
import { getFieldDefinition, getProviderDefinition } from "./catalog";
import {
  decryptIntegrationSecret,
  IntegrationEncryptionError,
  integrationEncryptionKeyIsConfigured,
  integrationSecretContext,
  maskIntegrationValue,
} from "./crypto";
import {
  DEFAULT_CACHE_TTL_MS,
  PROVIDER_STATE_KEY,
  recordHasPendingValue,
  trimEnvValue,
} from "./helpers";
import type {
  IntegrationSettingRecord,
  IntegrationSettingsActor,
  IntegrationSettingsAuditWriter,
  IntegrationSettingsRepository,
  IntegrationSettingsServiceOptions,
  SafeIntegrationProviderSnapshot,
} from "./types";
import { IntegrationSettingsError } from "./types";

type ResolvedIntegrationField = {
  definition: ReturnType<typeof getProviderDefinition>["fields"][number];
  record: IntegrationSettingRecord | null;
  configured: boolean;
  enabled: boolean;
  value: string | null;
  source: IntegrationValueSource;
  decryptionFailed: boolean;
};

type ResolvedIntegrationProvider = {
  provider: IntegrationProvider;
  enabled: boolean;
  databaseAvailable: boolean;
  stateRecord: IntegrationSettingRecord | null;
  fields: ResolvedIntegrationField[];
};

type CachedProvider = {
  expiresAt: number;
  value: ResolvedIntegrationProvider;
};

function isTestResult(value: string | null): value is IntegrationTestResult {
  return value === "SUCCESS" || value === "FAILED";
}

export class IntegrationSettingsResolver {
  readonly env: NodeJS.ProcessEnv;
  readonly now: () => Date;
  readonly encryptionKey: () => string | undefined;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<IntegrationProvider, CachedProvider>();

  constructor(
    private readonly repository: IntegrationSettingsRepository,
    private readonly auditWriter: IntegrationSettingsAuditWriter,
    options: IntegrationSettingsServiceOptions = {}
  ) {
    this.env = options.env ?? process.env;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.now = options.now ?? (() => new Date());
    this.encryptionKey =
      options.encryptionKey ??
      (() => process.env.INTEGRATION_SETTINGS_ENCRYPTION_KEY);
  }

  clearProviderCache(provider: IntegrationProvider): void {
    this.cache.delete(provider);
  }

  async auditFailure(
    actor: IntegrationSettingsActor,
    provider: IntegrationProvider,
    key: string | undefined,
    action: string,
    reasonCode: string
  ): Promise<void> {
    await this.auditWriter.write({
      actor,
      provider,
      key,
      action,
      success: false,
      metadata: { reasonCode },
    });
  }

  private async resolveProvider(
    provider: IntegrationProvider,
    actor?: IntegrationSettingsActor
  ): Promise<ResolvedIntegrationProvider> {
    const cached = this.cache.get(provider);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let records: IntegrationSettingRecord[] = [];
    let databaseAvailable = true;
    try {
      records = await this.repository.listByProvider(provider);
    } catch {
      databaseAvailable = false;
    }

    const stateRecord =
      records.find((row) => row.key === PROVIDER_STATE_KEY) ?? null;
    const providerEnabled = stateRecord?.enabled ?? true;
    const definition = getProviderDefinition(provider);
    const fields: ResolvedIntegrationField[] = [];

    for (const field of definition.fields) {
      const record = databaseAvailable
        ? records.find((row) => row.key === field.key) ?? null
        : null;

      if (record) {
        if (!record.enabled) {
          fields.push({ definition: field, record, configured: false, enabled: false, value: null, source: "DATABASE", decryptionFailed: false });
          continue;
        }
        if (field.secret) {
          if (!record.encryptedValue) {
            fields.push({ definition: field, record, configured: false, enabled: true, value: null, source: "DATABASE", decryptionFailed: false });
            continue;
          }
          try {
            const value = decryptIntegrationSecret(record.encryptedValue, integrationSecretContext(provider, field.key), this.encryptionKey());
            fields.push({ definition: field, record, configured: true, enabled: true, value, source: "DATABASE", decryptionFailed: false });
          } catch (error) {
            const code = error instanceof IntegrationEncryptionError ? error.code : "DECRYPTION_FAILED";
            if (actor) await this.auditFailure(actor, provider, field.key, "INTEGRATION_SETTING_DECRYPT_FAILED", code);
            fields.push({ definition: field, record, configured: false, enabled: true, value: null, source: "DATABASE", decryptionFailed: true });
          }
          continue;
        }
        const value = record.plainValue?.trim() || null;
        fields.push({ definition: field, record, configured: !!value, enabled: true, value, source: "DATABASE", decryptionFailed: false });
        continue;
      }
      const envValue = trimEnvValue(this.env[field.envKey]);
      fields.push({ definition: field, record: null, configured: !!envValue, enabled: true, value: envValue, source: envValue ? "ENVIRONMENT" : "NONE", decryptionFailed: false });
    }

    const resolved: ResolvedIntegrationProvider = { provider, enabled: providerEnabled, databaseAvailable, stateRecord, fields };
    this.cache.set(provider, { expiresAt: Date.now() + this.cacheTtlMs, value: resolved });
    return resolved;
  }

  async getProviderSnapshot(provider: IntegrationProvider, actor?: IntegrationSettingsActor): Promise<SafeIntegrationProviderSnapshot> {
    const resolved = await this.resolveProvider(provider, actor);
    const definition = getProviderDefinition(provider);
    const missingRequiredFields = resolved.fields.filter((field) => field.definition.required && !field.configured).map((field) => field.definition.key);
    const hasDecryptionError = resolved.fields.some((field) => field.decryptionFailed);
    return {
      provider,
      labelAr: definition.labelAr,
      enabled: resolved.enabled,
      status: !resolved.enabled ? "DISABLED" : hasDecryptionError ? "ERROR" : missingRequiredFields.length === 0 ? "READY" : "NOT_CONFIGURED",
      encryptionKeyConfigured: integrationEncryptionKeyIsConfigured(this.encryptionKey()),
      missingRequiredFields,
      fields: resolved.fields.map((field) => {
        const testRecord = field.record?.lastTestAt ? field.record : resolved.stateRecord;
        const lastTestResult = testRecord?.lastTestResult ?? null;
        return {
          key: field.definition.key,
          labelAr: field.definition.labelAr,
          isSecret: field.definition.secret,
          required: field.definition.required,
          configured: field.configured,
          enabled: field.enabled,
          maskedValue: maskIntegrationValue(field.value),
          source: field.source,
          version: field.record?.version ?? null,
          hasPendingValue: recordHasPendingValue(field.record),
          updatedAt: field.record?.updatedAt.toISOString() ?? null,
          updatedBy: field.record?.updatedBy ?? null,
          lastTestAt: testRecord?.lastTestAt?.toISOString() ?? null,
          lastTestResult: isTestResult(lastTestResult) ? lastTestResult : null,
          lastFailureReasonSafe: testRecord?.lastFailureReasonSafe ?? null,
        };
      }),
    };
  }

  async getResolvedValue(provider: IntegrationProvider, key: string, actor?: IntegrationSettingsActor): Promise<string | null> {
    const field = getFieldDefinition(provider, key);
    if (!field) throw new IntegrationSettingsError("UNKNOWN_FIELD", "Unknown integration setting field");
    const resolved = await this.resolveProvider(provider, actor);
    if (!resolved.enabled) return null;
    return resolved.fields.find((item) => item.definition.key === key)?.value ?? null;
  }

  async getResolvedProviderValues(provider: IntegrationProvider, actor?: IntegrationSettingsActor): Promise<Record<string, string>> {
    const resolved = await this.resolveProvider(provider, actor);
    if (!resolved.enabled) return {};
    return Object.fromEntries(resolved.fields.filter((field) => field.configured && field.value).map((field) => [field.definition.key, field.value as string]));
  }
}
