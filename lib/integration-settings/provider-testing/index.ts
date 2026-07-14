import { createHmac } from "node:crypto";
import type { IntegrationProvider } from "../catalog";
import type {
  IntegrationProviderTester,
  ProviderConnectionTestInput,
  ProviderConnectionTestResult,
} from "../types";
import { validateIntegrationSettingValue } from "../validation";
import { providerFetch, type ProviderFetch } from "./http";

const failed = (messageAr: string, failureCode