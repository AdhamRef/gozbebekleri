import type { IntegrationProvider, IntegrationTestResult } from "./catalog";
import { getFieldDefinition } from "./catalog";
import { encryptIntegrationSecret, IntegrationEncryptionError, integrationSecretContext } from "./crypto";
import { createDataToPatch, PROVIDER_STATE_KEY, safeFailureCode, sourceBeforeWrite, trimEnvValue } from "./helpers";
import { IntegrationSettingsResolver } from "./resolver";
import { validateIntegrationSettingValue } from "./validation";
import type {
  IntegrationSettingCreateData, IntegrationSettingInput, IntegrationSettingMutation,
  IntegrationSettingRecord, IntegrationSettingSaveResult, IntegrationSettingsActor,
  IntegrationSettingsAuditEntry, IntegrationSettingsAuditWriter, IntegrationSettingsRepository,
  IntegrationSettingsServiceOptions, SafeIntegrationProviderSnapshot,
} from "./types";
import { IntegrationSettingsError } from "./types";
export * from "./types";

type Ctx = { provider: IntegrationProvider; actor: IntegrationSettingsActor };

export class IntegrationSettingsService {
  private readonly resolver: IntegrationSettingsResolver;
  constructor(
    private readonly repository: IntegrationSettingsRepository,
    private readonly auditWriter: IntegrationSettingsAuditWriter,
    options: IntegrationSettingsServiceOptions = {}
  ) { this.resolver = new IntegrationSettingsResolver(repository, auditWriter, options); }

  clearProviderCache(provider: IntegrationProvider) { this.resolver.clearProviderCache(provider); }
  getProviderSnapshot(provider: IntegrationProvider, actor?: IntegrationSettingsActor) { return this.resolver.getProviderSnapshot(provider, actor); }
  getResolvedValue(provider: IntegrationProvider, key: string, actor?: IntegrationSettingsActor) { return this.resolver.getResolvedValue(provider, key, actor); }
  getResolvedProviderValues(provider: IntegrationProvider, actor?: IntegrationSettingsActor) { return this.resolver.getResolvedProviderValues(provider, actor); }

  private audit(entry: IntegrationSettingsAuditEntry) { return this.auditWriter.write(entry); }
  private fail(ctx: Ctx, action: string, reasonCode: string, key?: string) {
    return this.audit({ ...ctx, key, action, success: false, metadata: { reasonCode } });
  }
  private async rows(provider: IntegrationProvider, actor: IntegrationSettingsActor, action: string) {
    try { return await this.repository.listByProvider(provider); }
    catch {
      await this.fail({ provider, actor }, action, "REPOSITORY_FAILURE");
      throw new IntegrationSettingsError("REPOSITORY_FAILURE", "Unable to access integration settings");
    }
  }
  private base(ctx: Ctx, key: string, existing: IntegrationSettingRecord | null, secret: boolean): IntegrationSettingCreateData {
    return {
      provider: ctx.provider, key, encryptedValue: null, plainValue: null, isSecret: secret,
      enabled: true, version: (existing?.version ?? 0) + 1, source: "DATABASE",
      pendingEncryptedValue: null, pendingVersion: null, pendingCreatedAt: null,
      pendingUpdatedBy: null, pendingLastTestAt: null, pendingLastTestResult: null,
      pendingFailureReasonSafe: null, updatedBy: ctx.actor.actorId,
      lastTestAt: existing?.lastTestAt ?? null, lastTestResult: existing?.lastTestResult ?? null,
      lastFailureReasonSafe: existing?.lastFailureReasonSafe ?? null,
    };
  }

  async saveProviderSettings(provider: IntegrationProvider, inputs: readonly IntegrationSettingInput[], actor: IntegrationSettingsActor): Promise<{results: IntegrationSettingSaveResult[]; snapshot: SafeIntegrationProviderSnapshot}> {
    const ctx = { provider, actor };
    const seen = new Set<string>();
    for (const input of inputs) {
      if (!getFieldDefinition(provider, input.key)) {
        await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "UNKNOWN_FIELD", input.key);
        throw new IntegrationSettingsError("UNKNOWN_FIELD", "Unknown integration setting field");
      }
      if (seen.has(input.key)) {
        await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "DUPLICATE_FIELD", input.key);
        throw new IntegrationSettingsError("DUPLICATE_FIELD", "Duplicate integration setting field");
      }
      seen.add(input.key);
    }

    const existingRows = await this.rows(provider, actor, "INTEGRATION_SETTING_SAVE_FAILED");
    const byKey = new Map(existingRows.map((row) => [row.key, row]));
    const mutations: IntegrationSettingMutation[] = [];
    const results: IntegrationSettingSaveResult[] = [];
    const audits: IntegrationSettingsAuditEntry[] = [];

    for (const input of inputs) {
      const field = getFieldDefinition(provider, input.key)!;
      const existing = byKey.get(input.key) ?? null;
      if (!input.value.trim()) { results.push({ key: input.key, action: "UNCHANGED" }); continue; }

      let normalized: string;
      try { normalized = validateIntegrationSettingValue(provider, input.key, input.value); }
      catch (error) {
        await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "INVALID_FIELD_VALUE", input.key);
        throw error;
      }

      const previousSource = sourceBeforeWrite(existing, trimEnvValue(this.resolver.env[field.envKey]));
      const data = this.base(ctx, input.key, existing, field.secret);
      if (field.secret) {
        let encrypted: string;
        try { encrypted = encryptIntegrationSecret(normalized, integrationSecretContext(provider, input.key), this.resolver.encryptionKey()); }
        catch (error) {
          const code = error instanceof IntegrationEncryptionError ? error.code : "ENCRYPTION_KEY_INVALID";
          await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", code, input.key);
          throw new IntegrationSettingsError(code, "Encryption key is missing or invalid");
        }
        if (existing?.encryptedValue) {
          mutations.push({ type: "UPDATE", provider, key: input.key, patch: {
            pendingEncryptedValue: encrypted, pendingVersion: data.version,
            pendingCreatedAt: this.resolver.now(), pendingUpdatedBy: actor.actorId,
            pendingLastTestAt: null, pendingLastTestResult: null, pendingFailureReasonSafe: null,
          }});
          results.push({ key: input.key, action: "STAGED" });
          audits.push({ ...ctx, key: input.key, action: "INTEGRATION_SETTING_STAGED", success: true, metadata: { isSecret: true, pendingVersion: data.version } });
          continue;
        }
        data.encryptedValue = encrypted;
      } else data.plainValue = normalized;

      mutations.push(existing ? { type: "UPDATE", provider, key: input.key, patch: createDataToPatch(data) } : { type: "CREATE", data });
      const action = existing ? "UPDATED" : "CREATED";
      results.push({ key: input.key, action });
      audits.push({ ...ctx, key: input.key, action: `INTEGRATION_SETTING_${action}`, success: true, metadata: { isSecret: field.secret, version: data.version } });
      if (previousSource !== "DATABASE") audits.push({ ...ctx, key: input.key, action: "INTEGRATION_SETTING_SOURCE_CHANGED", success: true, metadata: { sourceBefore: previousSource, sourceAfter: "DATABASE" } });
    }

    if (mutations.length) {
      try { await this.repository.applyMutations(mutations); }
      catch {
        await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "REPOSITORY_FAILURE");
        throw new IntegrationSettingsError("REPOSITORY_FAILURE", "Unable to store integration settings");
      }
      this.clearProviderCache(provider);
      for (const entry of audits) await this.audit(entry);
    }
    return { results, snapshot: await this.getProviderSnapshot(provider, actor) };
  }

  async deleteSetting(provider: IntegrationProvider, key: string, actor: IntegrationSettingsActor) {
    const ctx = { provider, actor };
    if (!getFieldDefinition(provider, key)) throw new IntegrationSettingsError("UNKNOWN_FIELD", "Unknown integration setting field");
    const existing = (await this.rows(provider, actor, "INTEGRATION_SETTING_DELETE_FAILED")).find((r) => r.key === key);
    if (!existing) throw new IntegrationSettingsError("SETTING_NOT_FOUND", "Integration setting was not found");
    await this.repository.applyMutations([{ type: "DELETE", provider, key }]);
    this.clearProviderCache(provider);
    await this.audit({ ...ctx, key, action: "INTEGRATION_SETTING_DELETED", success: true, metadata: { isSecret: existing.isSecret } });
    if (trimEnvValue(this.resolver.env[getFieldDefinition(provider, key)!.envKey])) await this.audit({ ...ctx, key, action: "INTEGRATION_SETTING_SOURCE_CHANGED", success: true, metadata: { sourceBefore: "DATABASE", sourceAfter: "ENVIRONMENT" } });
    return this.getProviderSnapshot(provider, actor);
  }

  async setProviderEnabled(provider: IntegrationProvider, enabled: boolean, actor: IntegrationSettingsActor) {
    const ctx = { provider, actor };
    const rows = await this.rows(provider, actor, "INTEGRATION_PROVIDER_STATUS_CHANGE_FAILED");
    const existing = rows.find((r) => r.key === PROVIDER_STATE_KEY) ?? null;
    const data = this.base(ctx, PROVIDER_STATE_KEY, existing, false); data.enabled = enabled;
    await this.repository.applyMutations([existing ? { type: "UPDATE", provider, key: PROVIDER_STATE_KEY, patch: createDataToPatch(data) } : { type: "CREATE", data }]);
    this.clearProviderCache(provider);
    await this.audit({ ...ctx, action: enabled ? "INTEGRATION_PROVIDER_ENABLED" : "INTEGRATION_PROVIDER_DISABLED", success: true, metadata: { enabled } });
    return this.getProviderSnapshot(provider, actor);
  }

  async recordConnectionTest(provider: IntegrationProvider, result: IntegrationTestResult, actor: IntegrationSettingsActor, failureReason?: string | null) {
    const ctx = { provider, actor };
    const rows = await this.rows(provider, actor, "INTEGRATION_PROVIDER_TEST_FAILED");
    const existing = rows.find((r) => r.key === PROVIDER_STATE_KEY) ?? null;
    const data = this.base(ctx, PROVIDER_STATE_KEY, existing, false);
    data.enabled = existing?.enabled ?? true; data.lastTestAt = this.resolver.now(); data.lastTestResult = result;
    data.lastFailureReasonSafe = result === "FAILED" ? safeFailureCode(failureReason) : null;
    await this.repository.applyMutations([existing ? { type: "UPDATE", provider, key: PROVIDER_STATE_KEY, patch: createDataToPatch(data) } : { type: "CREATE", data }]);
    this.clearProviderCache(provider);
    await this.audit({ ...ctx, action: result === "SUCCESS" ? "INTEGRATION_PROVIDER_TEST_SUCCEEDED" : "INTEGRATION_PROVIDER_TEST_FAILED", success: result === "SUCCESS", metadata: data.lastFailureReasonSafe ? { failureReasonCode: data.lastFailureReasonSafe } : undefined });
  }

  async recordPendingSettingTest(provider: IntegrationProvider, key: string, pendingVersion: number, result: IntegrationTestResult, actor: IntegrationSettingsActor, failureReason?: string | null) {
    const existing = (await this.rows(provider, actor, "INTEGRATION_SETTING_PENDING_TEST_FAILED")).find((r) => r.key === key);
    if (!existing) throw new IntegrationSettingsError("SETTING_NOT_FOUND", "Integration setting was not found");
    if (!existing.pendingEncryptedValue || !existing.pendingVersion) throw new IntegrationSettingsError("PENDING_VALUE_NOT_FOUND", "No pending value exists");
    if (existing.pendingVersion !== pendingVersion) throw new IntegrationSettingsError("PENDING_VERSION_MISMATCH", "Pending value version does not match");
    const reason = result === "FAILED" ? safeFailureCode(failureReason) : null;
    await this.repository.applyMutations([{ type: "UPDATE", provider, key, patch: { pendingLastTestAt: this.resolver.now(), pendingLastTestResult: result, pendingFailureReasonSafe: reason } }]);
    this.clearProviderCache(provider);
    await this.audit({ provider, actor, key, action: result === "SUCCESS" ? "INTEGRATION_SETTING_PENDING_TEST_SUCCEEDED" : "INTEGRATION_SETTING_PENDING_TEST_FAILED", success: result === "SUCCESS", metadata: { pendingVersion, ...(reason ? { failureReasonCode: reason } : {}) } });
    return this.getProviderSnapshot(provider, actor);
  }

  async activatePendingSetting(provider: IntegrationProvider, key: string, pendingVersion: number, actor: IntegrationSettingsActor) {
    const existing = (await this.rows(provider, actor, "INTEGRATION_SETTING_PENDING_VALUE_ACTIVATION_FAILED")).find((r) => r.key === key);
    if (!existing?.pendingEncryptedValue || !existing.pendingVersion) throw new IntegrationSettingsError("PENDING_VALUE_NOT_FOUND", "No pending value exists");
    if (existing.pendingVersion !== pendingVersion) throw new IntegrationSettingsError("PENDING_VERSION_MISMATCH", "Pending value version does not match");
    if (existing.pendingLastTestResult !== "SUCCESS" || !existing.pendingLastTestAt || !existing.pendingCreatedAt || existing.pendingLastTestAt < existing.pendingCreatedAt) {
      throw new IntegrationSettingsError("PENDING_VALUE_NOT_VERIFIED", "Pending value must pass a test before activation");
    }
    await this.repository.applyMutations([{ type: "UPDATE", provider, key, patch: {
      encryptedValue: existing.pendingEncryptedValue, plainValue: null, version: existing.pendingVersion,
      pendingEncryptedValue: null, pendingVersion: null, pendingCreatedAt: null, pendingUpdatedBy: null,
      pendingLastTestAt: null, pendingLastTestResult: null, pendingFailureReasonSafe: null,
      updatedBy: actor.actorId, lastTestAt: existing.pendingLastTestAt, lastTestResult: "SUCCESS", lastFailureReasonSafe: null,
    }}]);
    this.clearProviderCache(provider);
    await this.audit({ provider, actor, key, action: "INTEGRATION_SETTING_PENDING_VALUE_ACTIVATED", success: true, metadata: { version: pendingVersion } });
    return this.getProviderSnapshot(provider, actor);
  }

  async discardPendingSetting(provider: IntegrationProvider, key: string, pendingVersion: number, actor: IntegrationSettingsActor, failureReason?: string | null) {
    const existing = (await this.rows(provider, actor, "INTEGRATION_SETTING_PENDING_VALUE_REJECTION_FAILED")).find((r) => r.key === key);
    if (!existing) throw new IntegrationSettingsError("SETTING_NOT_FOUND", "Integration setting was not found");
    if (!existing.pendingEncryptedValue || !existing.pendingVersion) throw new IntegrationSettingsError("PENDING_VALUE_NOT_FOUND", "No pending value exists");
    if (existing.pendingVersion !== pendingVersion) throw new IntegrationSettingsError("PENDING_VERSION_MISMATCH", "Pending value version does not match");
    await this.repository.applyMutations([{ type: "UPDATE", provider, key, patch: { pendingEncryptedValue: null, pendingVersion: null, pendingCreatedAt: null, pendingUpdatedBy: null, pendingLastTestAt: null, pendingLastTestResult: null, pendingFailureReasonSafe: null } }]);
    this.clearProviderCache(provider);
    const reason = safeFailureCode(failureReason);
    await this.audit({ provider, actor, key, action: "INTEGRATION_SETTING_PENDING_VALUE_REJECTED", success: true, metadata: { pendingVersion, ...(reason ? { failureReasonCode: reason } : {}) } });
    return this.getProviderSnapshot(provider, actor);
  }
}
