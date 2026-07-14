import type { Prisma } from "@/generated/integration-settings-client";
import { PrismaClient } from "@/generated/integration-settings-client";
import { writeAuditLog } from "@/lib/audit-log";
import {
  IntegrationSettingsService,
  type IntegrationSettingMutation,
  type IntegrationSettingRecord,
  type IntegrationSettingsAuditEntry,
  type IntegrationSettingsAuditWriter,
  type IntegrationSettingsRepository,
} from "./service";

const globalForIntegrationSettings = globalThis as unknown as {
  integrationSettingsPrisma?: PrismaClient;
};

const integrationSettingsPrisma =
  globalForIntegrationSettings.integrationSettingsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForIntegrationSettings.integrationSettingsPrisma = integrationSettingsPrisma;
}

class PrismaIntegrationSettingsRepository implements IntegrationSettingsRepository {
  async listByProvider(provider: Parameters<IntegrationSettingsRepository["listByProvider"]>[0]): Promise<IntegrationSettingRecord[]> {
    const rows = await integrationSettingsPrisma.integrationSetting.findMany({ where: { provider }, orderBy: { key: "asc" } });
    return rows as IntegrationSettingRecord[];
  }

  async applyMutations(mutations: readonly IntegrationSettingMutation[]): Promise<IntegrationSettingRecord[]> {
    if (!mutations.length) return [];
    const operations = mutations.map((mutation) => {
      if (mutation.type === "CREATE") return integrationSettingsPrisma.integrationSetting.create({ data: mutation.data as Prisma.IntegrationSettingUncheckedCreateInput });
      if (mutation.type === "UPDATE") return integrationSettingsPrisma.integrationSetting.update({ where: { provider_key: { provider: mutation.provider, key: mutation.key } }, data: mutation.patch as Prisma.IntegrationSettingUncheckedUpdateInput });
      return integrationSettingsPrisma.integrationSetting.delete({ where: { provider_key: { provider: mutation.provider, key: mutation.key } } });
    });
    return (await integrationSettingsPrisma.$transaction(operations)) as IntegrationSettingRecord[];
  }
}

class AuditLogIntegrationSettingsWriter implements IntegrationSettingsAuditWriter {
  async write(entry: IntegrationSettingsAuditEntry): Promise<void> {
    await writeAuditLog({
      actorId: entry.actor.actorId,
      actorName: entry.actor.actorName,
      actorRole: entry.actor.actorRole,
      action: entry.action,
      messageAr: `${entry.success ? "نجحت" : "فشلت"} عملية إدارة إعدادات ${entry.provider}`,
      entityType: "IntegrationSetting",
      entityId: entry.key ? `${entry.provider}:${entry.key}` : entry.provider,
      metadata: { provider: entry.provider, key: entry.key ?? null, success: entry.success, ...(entry.metadata ?? {}) },
      stream: "TEAM",
    });
  }
}

export const integrationSettingsService = new IntegrationSettingsService(
  new PrismaIntegrationSettingsRepository(),
  new AuditLogIntegrationSettingsWriter()
);
