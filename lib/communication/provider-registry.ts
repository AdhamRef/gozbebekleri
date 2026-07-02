import type { ProviderConnection } from "./communication-types";

export const communicationProviderRegistry: ProviderConnection[] = [
  {
    key: "META_WHATSAPP",
    channel: "WHATSAPP",
    name: "Meta WhatsApp Cloud API",
    status: "NOT_CONFIGURED",
    isPrimary: true,
    supportsTransactional: true,
    supportsMarketing: true,
    notes: "Direct WhatsApp provider. Template approval and webhook handling should stay provider-specific behind the adapter.",
  },
  {
    key: "BREVO_EMAIL",
    channel: "EMAIL",
    name: "Brevo Email",
    status: "NOT_CONFIGURED",
    isPrimary: true,
    supportsTransactional: true,
    supportsMarketing: true,
    notes: "Primary email provider for transactional email and campaigns.",
  },
  {
    key: "BREVO_SMS",
    channel: "SMS",
    name: "Brevo SMS",
    status: "NOT_CONFIGURED",
    isPrimary: true,
    supportsTransactional: true,
    supportsMarketing: false,
    notes: "Initial SMS provider for critical transactional messages only.",
  },
  {
    key: "SMS_FALLBACK",
    channel: "SMS",
    name: "SMS fallback provider",
    status: "DISABLED",
    isPrimary: false,
    supportsTransactional: true,
    supportsMarketing: false,
    notes: "Reserved for ClickSend, Infobip, or a local provider when country coverage requires fallback.",
  },
];

export function providerForChannel(channel: ProviderConnection["channel"]) {
  return communicationProviderRegistry.find((provider) => provider.channel === channel && provider.isPrimary);
}
