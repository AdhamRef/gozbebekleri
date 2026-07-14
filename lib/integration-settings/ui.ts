import type { IntegrationProvider } from "./catalog";
import type { SafeIntegrationProviderSnapshot } from "./types";

export type IntegrationUiStatus =
  | "READY"
  | "NEEDS_SETUP"
  | "PENDING_TEST"
  | "PENDING_ACTIVATION"
  | "TEST_FAILED"
  | "DISABLED"
  | "ENCRYPTION_ERROR"
  | "ENCRYPTION_KEY_MISSING";

export const INTEGRATION_UI_STATUS_LABEL: Record<IntegrationUiStatus, string> = {
  READY: "جاهز",
  NEEDS_SETUP: "يحتاج إعداد