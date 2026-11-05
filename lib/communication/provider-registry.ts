import type { CommunicationProviderKey, ProviderConnection } from "./communication-types";
import type { CommunicationChannelId } from "./communication-runtime-types";

export type ProviderScope = "ALL" | "INTERNATIONAL" | "TR";

export type OfficialProvider = {
  key: CommunicationProviderKey;
  channel: CommunicationChannelId;
  labelAr: string;
  scope: ProviderScope;
};

/**
 * Active provider matrix only.
 * Historical provider ids are handled by delivery-history parsers, never by active routing/UI.
 */
export const PROVIDER_REGISTRY: readonly OfficialProvider[] = [
  { key: "META_WHATSAPP", channel: "WHATSAPP", labelAr: "Meta WhatsApp", scope: "ALL" },
  { key: "ELASTIC_EMAIL", channel: "EMAIL", labelAr: "Elastic Email", scope: "ALL" },
] as const;

export function activeProviders(channel?: CommunicationChannelId): OfficialProvider[] {
  return PROVIDER_REGISTRY.filter((provider) => !channel || provider.channel === channel);
}

export function providerByKey(key: string): OfficialProvider | undefined {
  return PROVIDER_REGISTRY.find((provider) => provider.key === key);
}

export function isProviderActive(key: string): key is CommunicationProviderKey {
  return Boolean(providerByKey(key));
}

export const OFFICIAL_PROVIDER_MATRIX = {
  whatsapp: "META_WHATSAPP",
  email: "ELASTIC_EMAIL",
} as const satisfies Record<string, CommunicationProviderKey>;

export const communicationProviderRegistry: ProviderConnection[] = PROVIDER_REGISTRY.map((provider) => ({
  key: provider.key,
  channel: provider.channel,
  name: provider.labelAr,
  status: "NOT_CONFIGURED",
  isPrimary: true,
  supportsTransactional: true,
  supportsMarketing: true,
  notes: null,
}));

export function providerForChannel(channel: CommunicationChannelId) {
  return communicationProviderRegistry.find((provider) => provider.channel === channel && provider.isPrimary);
}
