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

/* ============================================================================
 * OFFICIAL FINAL PROVIDER REGISTRY (single source of truth)
 * Used by: ProviderRouter, settings/readiness UI, platform-connections page,
 * provider test tools, and docs. Inactive/legacy providers must NOT be shown as
 * normal active options in user-facing UI.
 * ==========================================================================*/

export type ProviderChannel = "WHATSAPP" | "EMAIL" | "SMS";
export type ProviderScope = "ALL" | "INTERNATIONAL" | "TR";

export type OfficialProvider = {
  key: string;
  channel: ProviderChannel;
  labelAr: string;
  active: boolean;
  legacy: boolean;
  scope?: ProviderScope;
  status?: "ACTIVE" | "DISABLED";
};

export const PROVIDER_REGISTRY: OfficialProvider[] = [
  // WhatsApp
  { key: "META_WHATSAPP", channel: "WHATSAPP", labelAr: "Meta WhatsApp", active: true, legacy: false, scope: "ALL", status: "ACTIVE" },
  // Email
  { key: "BREVO_EMAIL", channel: "EMAIL", labelAr: "Brevo Email", active: true, legacy: false, scope: "ALL", status: "ACTIVE" },
  { key: "SENDGRID", channel: "EMAIL", labelAr: "SendGrid", active: false, legacy: true, scope: "ALL", status: "DISABLED" },
  // SMS
  { key: "BREVO_SMS", channel: "SMS", labelAr: "Brevo SMS", active: true, legacy: false, scope: "INTERNATIONAL", status: "ACTIVE" },
  { key: "NETGSM_SMS", channel: "SMS", labelAr: "Netgsm SMS", active: true, legacy: false, scope: "TR", status: "ACTIVE" },
  // Legacy
  { key: "TWILIO", channel: "SMS", labelAr: "Twilio", active: false, legacy: true, status: "DISABLED" },
];

/** Active (non-legacy) providers only — the set that user-facing UI may present. */
export function activeProviders(channel?: ProviderChannel): OfficialProvider[] {
  return PROVIDER_REGISTRY.filter((p) => p.active && !p.legacy && (!channel || p.channel === channel));
}

/** Legacy/disabled providers (Twilio, SendGrid) — shown only under a "قديم" section, never active. */
export function legacyProviders(): OfficialProvider[] {
  return PROVIDER_REGISTRY.filter((p) => p.legacy || !p.active);
}

export function providerByKey(key: string): OfficialProvider | undefined {
  return PROVIDER_REGISTRY.find((p) => p.key === key);
}

export function isProviderActive(key: string): boolean {
  const p = providerByKey(key);
  return !!p && p.active && !p.legacy;
}

export const OFFICIAL_PROVIDER_MATRIX = {
  whatsapp: "META_WHATSAPP",
  email: "BREVO_EMAIL",
  smsInternational: "BREVO_SMS",
  smsTurkey: "NETGSM_SMS",
  legacyDisabled: ["TWILIO", "SENDGRID"],
} as const;
