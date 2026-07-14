import { getCanonicalApplicationUrl } from "./canonical-url";
import { integrationEncryptionKeyIsConfigured } from "./crypto";
import { cronInfrastructureStatus } from "../communication/cron-auth";

export type ReleaseCheckStatus = "PASS" | "WARNING" | "BLOCKED";

export type ReleaseCheck = {
  id: string;
  status: ReleaseCheckStatus;
  message: string;
};

export type MongoIndexDescription = {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
};

export const INTEGRATION_SETTING_COLLECTION = "IntegrationSetting";

export const EXPECT