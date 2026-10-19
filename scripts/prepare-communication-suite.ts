/** Add only the new communication indexes. No data copy, reset or provider calls. */
import { PrismaClient } from "@prisma/client";

const plans = [
  { collection: "WhatsappTemplateWabaVariant", indexes: [
    { key: { templateId: 1, provider: 1, businessAccountId: 1, languageCode: 1 }, name: "WhatsappTemplateWabaVariant_templateId_provider_businessAccountId_languageCode_key", unique: true },
    { key: { businessAccountId: 1, approvalStatus: 1 }, name: "WhatsappTemplateWabaVariant_businessAccountId_approvalStatus_idx" },
    { key: { providerTemplateName: 1 }, name: "WhatsappTemplateWabaVariant_providerTemplateName_idx" },
  ] },
  { collection: "WhatsappTemplateVariant", indexes: [
    { key: { templateId: 1, provider: 1, languageCode: 1 }, name: "WhatsappTemplateVariant_templateId_provider_languageCode_key", unique: true },
    { key: { provider: 1, approvalStatus: 1 }, name: "WhatsappTemplateVariant_provider_approvalStatus_idx" },
    { key: { providerTemplateName: 1 }, name: "WhatsappTemplateVariant_providerTemplateName_idx" },
  ] },
  { collection: "CommunicationCampaignDeferredRecipient", indexes: [
    { key: { campaignId: 1, cursorId: 1 }, name: "CommunicationCampaignDeferredRecipient_campaignId_cursorId_key", unique: true },
    { key: { campaignId: 1, nextAttemptAt: 1 }, name: "CommunicationCampaignDeferredRecipient_campaignId_nextAttemptAt_idx" },
  ] },
  { collection: "EmailSuppression", indexes: [
    { key: { email: 1 }, name: "EmailSuppression_email_key", unique: true },
    { key: { scope: 1 }, name: "EmailSuppression_scope_idx" },
    { key: { reason: 1 }, name: "EmailSuppression_reason_idx" },
    { key: { userId: 1 }, name: "EmailSuppression_userId_idx" },
  ] },
];

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ dryRun: true, plans }, null, 2));
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for --apply");
  const prisma = new PrismaClient();
  try {
    for (const plan of plans) {
      const result = await prisma.$runCommandRaw(JSON.parse(JSON.stringify({ createIndexes: plan.collection, indexes: plan.indexes })));
      console.log(JSON.stringify({ collection: plan.collection, result }));
    }
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
