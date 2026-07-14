import { PrismaClient } from "../../generated/integration-settings-client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$runCommandRaw({
    createIndexes: "IntegrationSetting",
    indexes: [
      { key: { provider: 1, key: 1 }, name: "IntegrationSetting_provider_key_unique", unique: true },
      { key: { provider: 1, enabled: 1 }, name: "IntegrationSetting_provider_enabled_idx" },
      { key: { updatedAt: -1 }, name: "IntegrationSetting_updatedAt_desc_idx" },
    ],
  });
}

main()
  .catch((error) => {
    console.error("Integration settings migration failed without exposing values.");
    process.exitCode = 1;
    if (process.env.NODE_ENV === "development") console.error(error instanceof Error ? error.name : "UnknownMigrationError");
  })
  .finally(async () => prisma.$disconnect());
