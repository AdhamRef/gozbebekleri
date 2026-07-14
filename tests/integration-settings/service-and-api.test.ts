import test from "node:test";
import assert from "node:assert/strict";
import { IntegrationSettingsService, IntegrationSettingsError } from "../../lib/integration-settings/service";
import type {
  IntegrationSettingMutation,
  IntegrationSettingRecord,
  IntegrationSettingsAuditEntry,
  IntegrationSettingsRepository,
} from "../../lib/integration-settings/types";
import {
  INTEGRATION_SETTINGS_ROUTE_PERMISSIONS,
  integrationSettingsUpdateSchema,
  pendingSettingActivationSchema,
  pendingSettingDiscardSchema,
  pendingSettingTestSchema,
} from "../../lib/integration-settings/api-contracts";
import { userHasDashboardPermission } from "../../lib/dashboard/permissions";

const KEY = Buffer.alloc(32, 9).toString("base64");
const actor = { actorId: "507f1f77bcf86cd799439011", actorRole: "ADMIN", actorName: "Tester" };

class MemoryRepository implements IntegrationSettingsRepository {
  readonly rows = new Map<string, IntegrationSettingRecord>();
  writes = 0;
  private id = 0;
  private mapKey(provider: string, key: string) { return `${provider}:${key}`; }
  async listByProvider(provider: string) {
    return [...this.rows.values()].filter((row) => row.provider === provider).map((row) => ({ ...row }));
  }
  async applyMutations(mutations: readonly IntegrationSettingMutation[]) {
    this.writes += 1;
    const changed: IntegrationSettingRecord[] = [];
    for (const mutation of mutations) {
      if (mutation.type === "CREATE") {
        const now = new Date();
        const row: IntegrationSettingRecord = { ...mutation.data, id: `id-${++this.id}`, createdAt: now, updatedAt: now };
        this.rows.set(this.mapKey(row.provider, row.key), row);
        changed.push({ ...row });
      } else if (mutation.type === "UPDATE") {
        const mapKey = this.mapKey(mutation.provider, mutation.key);
        const existing = this.rows.get(mapKey);
        if (!existing) throw new Error("missing row");
        const row = { ...existing, ...mutation.patch, updatedAt: new Date() };
        this.rows.set(mapKey, row);
        changed.push({ ...row });
      } else {
        const mapKey = this.mapKey(mutation.provider, mutation.key);
        const existing = this.rows.get(mapKey);
        if (!existing) throw new Error("missing row");
        this.rows.delete(mapKey);
        changed.push({ ...existing });
      }
    }
    return changed;
  }
}

function setup(env: NodeJS.ProcessEnv = { NODE_ENV: "test" }) {
  const repository = new MemoryRepository();
  const audits: IntegrationSettingsAuditEntry[] = [];
  let clock = 1_000;
  const service = new IntegrationSettingsService(repository, { write: async (entry) => { audits.push(entry); } }, {
    env,
    encryptionKey: () => KEY,
    now: () => new Date(++clock),
    cacheTtlMs: 60_000,
  });
  return { repository, audits, service };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error) => error instanceof IntegrationSettingsError && error.code === code);
}

test("safe response separates secret masks from non-secret display values", async () => {
  const environmentSecret = "environment-secret-token-that-must-never-display";
  const { service } = setup({
    NODE_ENV: "test",
    META_WHATSAPP_ACCESS_TOKEN: environmentSecret,
    META_GRAPH_VERSION: "v23.0",
  });
  await service.saveProviderSettings("META_WHATSAPP", [
    { key: "APP_SECRET", value: "0123456789abcdef0123456789abcdef" },
    { key: "BUSINESS_ACCOUNT_ID", value: " 123456789012345 " },
  ], actor);
  const snapshot = await service.getProviderSnapshot("META_WHATSAPP", actor);
  const appSecret = snapshot.fields.find((field) => field.key === "APP_SECRET")!;
  const accessToken = snapshot.fields.find((field) => field.key === "ACCESS_TOKEN")!;
  const businessId = snapshot.fields.find((field) => field.key === "BUSINESS_ACCOUNT_ID")!;
  const graphVersion = snapshot.fields.find((field) => field.key === "GRAPH_API_VERSION")!;

  assert.equal(appSecret.displayValue, null);
  assert.match(appSecret.maskedValue ?? "", /^•{8}/);
  assert.equal(accessToken.displayValue, null);
  assert.notEqual(accessToken.maskedValue, environmentSecret);
  assert.equal(businessId.displayValue, "123456789012345");
  assert.equal(businessId.maskedValue, null);
  assert.equal(graphVersion.displayValue, "v23.0");
  assert.equal(JSON.stringify(snapshot).includes("0123456789abcdef0123456789abcdef"), false);
  assert.equal(JSON.stringify(snapshot).includes(environmentSecret), false);
  assert.equal(JSON.stringify(snapshot).includes("encryptedValue"), false);
});

test("invalid values and unknown fields are rejected before repository writes", async () => {
  const { service, repository } = setup();
  await expectCode(service.saveProviderSettings("META_WHATSAPP", [{ key: "GRAPH_API_VERSION", value: "23" }], actor), "INVALID_FIELD_VALUE");
  await expectCode(service.saveProviderSettings("BREVO", [{ key: "EMAIL_SENDER_EMAIL", value: "not-an-email" }], actor), "INVALID_FIELD_VALUE");
  await expectCode(service.saveProviderSettings("SYSTEM", [{ key: "CRON_SECRET", value: "weak" }], actor), "INVALID_FIELD_VALUE");
  await expectCode(service.saveProviderSettings("BREVO", [{ key: "UNKNOWN", value: "anything" }], actor), "UNKNOWN_FIELD");
  assert.equal(repository.writes, 0);
});

test("pending secret requires current successful test and preserves active secret on discard", async () => {
  const { service, repository, audits } = setup();
  await service.saveProviderSettings("BREVO", [{ key: "API_KEY", value: "xkeysib-original-api-key-value-123456" }], actor);
  const activeBefore = await service.getResolvedValue("BREVO", "API_KEY", actor);
  const staged = await service.saveProviderSettings("BREVO", [{ key: "API_KEY", value: "xkeysib-pending-api-key-value-654321" }], actor);
  const pendingVersion = staged.snapshot.fields.find((field) => field.key === "API_KEY")!.pendingVersion!;

  await expectCode(service.activatePendingSetting("BREVO", "API_KEY", pendingVersion, actor), "PENDING_VALUE_NOT_VERIFIED");
  await expectCode(service.recordPendingSettingTest("BREVO", "API_KEY", pendingVersion + 1, "SUCCESS", actor), "PENDING_VERSION_MISMATCH");
  await service.recordPendingSettingTest("BREVO", "API_KEY", pendingVersion, "FAILED", actor, "AUTH_REJECTED");
  await expectCode(service.activatePendingSetting("BREVO", "API_KEY", pendingVersion, actor), "PENDING_VALUE_NOT_VERIFIED");
  await service.discardPendingSetting("BREVO", "API_KEY", pendingVersion, actor, "USER_CANCELLED");
  assert.equal(await service.getResolvedValue("BREVO", "API_KEY", actor), activeBefore);
  assert.equal(repository.rows.get("BREVO:API_KEY")?.pendingEncryptedValue, null);
  assert.ok(audits.some((entry) => entry.action === "INTEGRATION_SETTING_PENDING_TEST_FAILED"));
  assert.ok(audits.some((entry) => entry.action === "INTEGRATION_SETTING_PENDING_VALUE_REJECTED" && entry.success));
  assert.equal(JSON.stringify(audits).includes("xkeysib"), false);
});

test("successful current pending test allows activation only for that version", async () => {
  const { service, audits } = setup();
  await service.saveProviderSettings("BREVO", [{ key: "API_KEY", value: "xkeysib-original-api-key-value-123456" }], actor);
  const staged = await service.saveProviderSettings("BREVO", [{ key: "API_KEY", value: "xkeysib-new-api-key-value-654321" }], actor);
  const pendingVersion = staged.snapshot.fields.find((field) => field.key === "API_KEY")!.pendingVersion!;
  await service.recordPendingSettingTest("BREVO", "API_KEY", pendingVersion, "SUCCESS", actor);
  await expectCode(service.activatePendingSetting("BREVO", "API_KEY", pendingVersion + 1, actor), "PENDING_VERSION_MISMATCH");
  await service.activatePendingSetting("BREVO", "API_KEY", pendingVersion, actor);
  assert.equal(await service.getResolvedValue("BREVO", "API_KEY", actor), "xkeysib-new-api-key-value-654321");
  assert.ok(audits.some((entry) => entry.action === "INTEGRATION_SETTING_PENDING_TEST_SUCCEEDED"));
  assert.ok(audits.some((entry) => entry.action === "INTEGRATION_SETTING_PENDING_VALUE_ACTIVATED"));
});

test("API contracts reject malformed lifecycle requests and define permission boundaries", () => {
  assert.equal(pendingSettingTestSchema.safeParse({ pendingVersion: 1, result: "SUCCESS" }).success, true);
  assert.equal(pendingSettingTestSchema.safeParse({ pendingVersion: 0, result: "SUCCESS" }).success, false);
  assert.equal(pendingSettingActivationSchema.safeParse({ pendingVersion: -1 }).success, false);
  assert.equal(pendingSettingDiscardSchema.safeParse({ pendingVersion: 1, failureReason: "x".repeat(97) }).success, false);
  assert.equal(integrationSettingsUpdateSchema.safeParse({ settings: [{ key: "", value: "x" }] }).success, false);
  assert.equal(INTEGRATION_SETTINGS_ROUTE_PERMISSIONS.pendingTest, "platformConnectionsTest");
  assert.equal(INTEGRATION_SETTINGS_ROUTE_PERMISSIONS.pendingActivate, "platformConnectionsManage");
  assert.equal(INTEGRATION_SETTINGS_ROUTE_PERMISSIONS.pendingDiscard, "platformConnectionsManage");
});

test("route permission hierarchy rejects missing or insufficient privileges", () => {
  assert.equal(userHasDashboardPermission(undefined, "platformConnections"), false);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: [] }, "platformConnections"), false);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["platformConnections"] }, "platformConnectionsManage"), false);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["platformConnectionsManage"] }, "platformConnectionsManage"), true);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["platformConnectionsTest"] }, "platformConnectionsTest"), true);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["platformConnectionsTest"] }, "platformConnectionsManage"), false);
});
