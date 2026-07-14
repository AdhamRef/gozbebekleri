import type { IntegrationProvider } from "./catalog";
import { getProviderDefinition } from "./catalog";
import { PROVIDER_STATE_KEY, safeFailureCode } from "./helpers";
import { integrationSettingsService } from "./prisma-service";
import { IntegrationProviderTesterRegistry } from "./provider-testing";
import type {
  IntegrationProviderTester,
  IntegrationSettingsActor,
  ProviderConnectionTestResult,
  SafeProviderConnectionTestResponse,
} from "./types";
import type { Prisma } from "@/generated/integration-settings-client";
import { PrismaClient } from "@/generated/integration-settings-client";

export type ActiveTestState = {
  lastTestAt: string | null;
  lastTestResult: "SUCCESS" | "FAILED" | null;
  lastFailureReasonSafe: string | null;
};

type ActiveTestDependencies = {
  resolveValues?: (provider: IntegrationProvider, actor: IntegrationSettingsActor) => Promise<Record<string, string>>;
  tester?: IntegrationProviderTester;
  record?: (provider: IntegrationProvider, testedAt: Date, result: ProviderConnectionTestResult, actorId: string) => Promise<void>;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
};

const globalForActiveTests = globalThis as unknown as { integrationSettingsPrisma?: PrismaClient };
const activeTestPrisma = globalForActiveTests.integrationSettingsPrisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : [] });
if (process.env.NODE_ENV !== "production") globalForActiveTests.integrationSettingsPrisma = activeTestPrisma;

function stateCreate(provider: IntegrationProvider, actorId: string, testedAt: Date, result: ProviderConnectionTestResult): Prisma.IntegrationSettingUncheckedCreateInput {
  return {
    provider,
    key: PROVIDER_STATE_KEY,
    encryptedValue: null,
    plainValue: null,
    isSecret: false,
    enabled: true,
    version: 0,
    source: "DATABASE",
    pendingEncryptedValue: null,
    pendingPlainValue: null,
    pendingVersion: null,
    pendingCandidateVersion: null,
    pendingCreatedAt: null,
    pendingUpdatedBy: null,
    candidateVersion: null,
    candidateCreatedAt: null,
    candidateLastTestVersion: null,
    candidateLastTestAt: null,
    candidateLastTestResult: null,
    candidateFailureReasonSafe: null,
    updatedBy: actorId,
    lastTestAt: testedAt,
    lastTestResult: result.success ? "SUCCESS" : "FAILED",
    lastFailureReasonSafe: result.success ? null : safeFailureCode(result.failureCode),
  };
}

export async function recordActiveProviderTest(provider: IntegrationProvider, testedAt: Date, result: ProviderConnectionTestResult, actorId: string): Promise<void> {
  await activeTestPrisma.integrationSetting.upsert({
    where: { provider_key: { provider, key: PROVIDER_STATE_KEY } },
    create: stateCreate(provider, actorId, testedAt, result),
    update: {
      lastTestAt: testedAt,
      lastTestResult: result.success ? "SUCCESS" : "FAILED",
      lastFailureReasonSafe: result.success ? null : safeFailureCode(result.failureCode),
      updatedBy: actorId,
    },
  });
}

export async function getActiveProviderTestState(provider: IntegrationProvider): Promise<ActiveTestState> {
  const state = await activeTestPrisma.integrationSetting.findUnique({
    where: { provider_key: { provider, key: PROVIDER_STATE_KEY } },
    select: { lastTestAt: true, lastTestResult: true, lastFailureReasonSafe: true },
  }).catch(() => null);
  return {
    lastTestAt: state?.lastTestAt?.toISOString() ?? null,
    lastTestResult: state?.lastTestResult === "SUCCESS" || state?.lastTestResult === "FAILED" ? state.lastTestResult : null,
    lastFailureReasonSafe: state?.lastFailureReasonSafe ?? null,
  };
}

function cronResult(env: NodeJS.ProcessEnv): ProviderConnectionTestResult {
  const secret = env.CRON_SECRET;
  if (!secret) return { success: false, connectionStatus: "NOT_CONFIGURED", messageAr: "مفتاح Cron غير مضبوط في إعدادات السيرفر.", failureCode: "CRON_SECRET_MISSING" };
  if (secret.length < 32 || /[\r\n]/.test(secret)) return { success: false, connectionStatus: "FAILED", messageAr: "مفتاح Cron لا يحقق متطلبات الأمان.", failureCode: "CRON_SECRET_INVALID" };
  return { success: true, connectionStatus: "CONNECTED", messageAr: "حماية Route الجدولة مضبوطة داخل البنية التحتية، ولم يتم تشغيل أي حملة.", failureCode: null };
}

export async function testActiveProviderConnection(
  provider: IntegrationProvider,
  actor: IntegrationSettingsActor,
  dependencies: ActiveTestDependencies = {}
): Promise<SafeProviderConnectionTestResponse> {
  const testedAt = (dependencies.now ?? (() => new Date()))();
  const env = dependencies.env ?? process.env;
  let result: ProviderConnectionTestResult;
  let missingRequiredFields: string[] = [];

  if (provider === "SYSTEM") {
    result = cronResult(env);
  } else {
    const resolveValues = dependencies.resolveValues ?? ((p, a) => integrationSettingsService.getResolvedProviderValues(p, a));
    const values = await resolveValues(provider, actor);
    missingRequiredFields = getProviderDefinition(provider).fields.filter((field) => field.required && !values[field.key]).map((field) => field.key);
    if (missingRequiredFields.length) {
      result = { success: false, connectionStatus: "NOT_CONFIGURED", messageAr: "بيانات التكوين العامل المطلوبة غير مكتملة.", failureCode: "MISSING_REQUIRED_FIELDS" };
    } else {
      const tester = dependencies.tester ?? new IntegrationProviderTesterRegistry();
      try { result = await tester.test({ provider, values, candidateVersion: null }); }
      catch { result = { success: false, connectionStatus: "FAILED", messageAr: "تعذر تنفيذ فحص الإعدادات الحالية.", failureCode: "PROVIDER_TEST_REQUEST_FAILED" }; }
    }
  }

  const record = dependencies.record ?? recordActiveProviderTest;
  await record(provider, testedAt, result, actor.actorId);
  integrationSettingsService.clearProviderCache(provider);
  return { ...result, provider, testedAt: testedAt.toISOString(), candidateVersion: null, missingRequiredFields };
}
