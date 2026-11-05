import type { CommunicationRuntimeBundle } from "../../runtime-config";

export const SMS_REASONS = {
  NETGSM_NOT_CONFIGURED: "NETGSM_NOT_CONFIGURED",
  BREVO_NOT_CONFIGURED: "BREVO_SMS_NOT_CONFIGURED",
} as const;

export type SmsProviderId = "NETGSM_SMS" | "BREVO_SMS";
export type SmsRouteResult = { configured: true; provider: SmsProviderId } | { configured: false; provider: SmsProviderId; reason: string };

export function resolveSmsProviderWithRuntime(runtime: CommunicationRuntimeBundle, country?: string | null, phone?: string | null): SmsRouteResult {
  return { configured: false, provider: "BREVO_SMS", reason: "CHANNEL_REMOVED" };
}

export async function resolveSmsProvider(country?: string | null, phone?: string | null, runtime?: CommunicationRuntimeBundle): Promise<SmsRouteResult> {
  return { configured: false, provider: "BREVO_SMS", reason: "CHANNEL_REMOVED" };
}

export async function isSmsConfigured(country?: string | null, phone?: string | null, runtime?: CommunicationRuntimeBundle): Promise<boolean> {
  return false;
}

export type SmsSendInput = { to: string; content: string; country?: string | null; sender?: string | null; type?: "transactional" | "marketing"; tag?: string | null };
export type SmsSendResult =
  | { ok: true; provider: SmsProviderId; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; provider: SmsProviderId; reason: string; detail?: string };

export async function sendSmsMessage(input: SmsSendInput, runtime?: CommunicationRuntimeBundle): Promise<SmsSendResult> {
  return { ok: false, provider: "BREVO_SMS", reason: "CHANNEL_REMOVED" };
}
