export const ACTIVE_RUNTIME_POLICY_FAILURE = {
  PROVIDER_DISABLED: "PROVIDER_DISABLED",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  INTEGRATION_DATABASE_UNAVAILABLE: "INTEGRATION_DATABASE_UNAVAILABLE",
  INTEGRATION_DECRYPTION_FAILED: "INTEGRATION_DECRYPTION_FAILED",
} as const;

export type ActiveRuntimePolicyFailure =
  (typeof ACTIVE_RUNTIME_POLICY_FAILURE)[keyof typeof ACTIVE_RUNTIME_POLICY_FAILURE];

export type ActiveRuntimePolicyInput = {
  enabled: boolean;
  databaseAvailable: boolean;
  values: Record<string, string>;
  decryptionFailedFields: