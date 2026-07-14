import type {
  IntegrationProvider,
  IntegrationTestResult,
  IntegrationValueSource,
} from "./catalog";
import type { IntegrationEncryptionError } from "./crypto";

export type IntegrationSettingRecord = {
  id: string;
  provider: string;
  key: string;
  encryptedValue: string | null;
  plainValue: string | null;
  isSecret: boolean;
  enabled: boolean;
  version: number;
  source: string;
  pendingEncryptedValue: string | null;
  pendingVersion: number | null;
  pendingCreatedAt: Date | null;
  pendingUpdatedBy: string | null;
  pendingLastTestAt: Date | null;
  pendingLastTestResult: string | null;
  pendingFailureReasonSafe: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
  lastTestAt: Date | null;
  lastTestResult: string | null;
  lastFailureReasonSafe: string | null;
};

export type IntegrationSettingCreateData = Omit<
  IntegrationSettingRecord,
  "id" | "createdAt" | "updatedAt"
>;

export type IntegrationSettingPatch = Partial<
  Omit<
    IntegrationSettingRecord,
    "id" | "provider" | "key" | "createdAt" | "updatedAt"
  >
>;

export type IntegrationSettingMutation =
  | { type: "CREATE"; data: IntegrationSettingCreateData }
  | {
      type: "UPDATE";
      provider: IntegrationProvider;
      key: string;
      patch: IntegrationSettingPatch;
    }
  | { type: "DELETE"; provider: IntegrationProvider; key: string };

export interface IntegrationSettingsRepository {
  listByProvider(provider: IntegrationProvider): Promise<IntegrationSettingRecord[]>;
  applyMutations(
    mutations: readonly IntegrationSettingMutation[]
  ): Promise<IntegrationSettingRecord[]>;
}

export type IntegrationSettingsActor = {
  actorId: string;
  actorName?: string | null;
  actorRole: string;
};

export type IntegrationSettingsAuditEntry = {
  actor: IntegrationSettingsActor;
  action: string;
  provider: IntegrationProvider;
  key?: string;
  success: boolean;
  metadata?: Record<string, string | number | boolean | null | string[]>;
};

export interface IntegrationSettingsAuditWriter {
  write(entry: IntegrationSettingsAuditEntry): Promise<void>;
}

export type IntegrationSettingInput = {
  key: string;
  value: string;
};

export type IntegrationSettingSaveResult = {
  key: string;
  action: "CREATED" | "UPDATED" | "STAGED" | "UNCHANGED";
};

export type SafeIntegrationField = {
  key: string;
  labelAr: string;
  isSecret: boolean;
  required: boolean;
  configured: boolean;
  enabled: boolean;
  maskedValue: string | null;
  source: IntegrationValueSource;
  version: number | null;
  hasPendingValue: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  lastTestAt: string | null;
  lastTestResult: IntegrationTestResult | null;
  lastFailureReasonSafe: string | null;
};

export type SafeIntegrationProviderSnapshot = {
  provider: IntegrationProvider;
  labelAr: string;
  enabled: boolean;
  status: "READY" | "NOT_CONFIGURED" | "DISABLED" | "ERROR";
  encryptionKeyConfigured: boolean;
  missingRequiredFields: string[];
  fields: SafeIntegrationField[];
};

export type IntegrationSettingsServiceOptions = {
  env?: NodeJS.ProcessEnv;
  cacheTtlMs?: number;
  now?: () => Date;
  encryptionKey?: () => string | undefined;
};

export type IntegrationSettingsErrorCode =
  | "UNKNOWN_FIELD"
  | "DUPLICATE_FIELD"
  | "REPOSITORY_FAILURE"
  | "SETTING_NOT_FOUND"
  | "PENDING_VALUE_NOT_FOUND"
  | "PENDING_VALUE_NOT_VERIFIED"
  | "INVALID_PROVIDER_STATE";

export class IntegrationSettingsError extends Error {
  readonly code: IntegrationSettingsErrorCode | IntegrationEncryptionError["code"];

  constructor(
    code: IntegrationSettingsErrorCode | IntegrationEncryptionError["code"],
    message: string
  ) {
    super(message);
    this.name = "IntegrationSettingsError";
    this.code = code;
  }
}
