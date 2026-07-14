import type { IntegrationProvider, IntegrationTestResult, IntegrationValueSource } from "./catalog";
import { getFieldDefinition, getProviderDefinition } from "./catalog";
import {
  decryptIntegrationSecret,
  IntegrationEncryptionError,
  integrationEncryptionKeyIsConfigured,
  integrationSecretContext,
  maskIntegrationValue,
} from "./crypto";
import { DEFAULT_CACHE_TTL_MS, PROVIDER_STATE_KEY, recordHasPendingValue, trimEnvValue } from "./helpers";
import type {
  IntegrationCandidateConfiguration,
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
  records: IntegrationSettingRecord[];
  fields: ResolvedIntegration