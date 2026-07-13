import { isNetgsmConfigured, sendNetgsmSms } from "../netgsm/client";
import { isTurkishNumber } from "../netgsm/types";
import { isBrevoSmsConfigured, sendBrevoSms } from "../brevo/sms-client";

/**
 * SMS provider routing for the Communication Center (final architecture):
 *   - Turkish numbers (+90 / countryCode TR)  → Netgsm
 *   - All other (international) numbers         → Brevo SMS
 *
 * Twilio is LEGACY_DISABLED and is NEVER used here. There is no silent fallback: if the routed
 * provider is not configured or fails, we return a safe reason and send nothing.
 */

export const SMS_REASONS = {
  NETGSM_NOT_CONFIGURED: "NETGSM_NOT_CONFIGURED",
  BREVO_NOT_CONFIGURED: "BREVO_SMS_NOT_CONFIGURED",
} as const;

export type SmsProviderId = "NETGSM_SMS" | "BREVO_SMS";

export type SmsRouteResult = { configured: true; provider: SmsProviderId } | { configured: false; provider: SmsProviderId; reason: string };

/** Pick the SMS provider by country/phone: TR → Netgsm, otherwise Brevo. Config-gated. */
export function resolveSmsProvider(country?: string | null, phone?: string | null): SmsRouteResult {
  if (isTurkishNumber(phone, country)) {
    return isNetgsmConfigured() ? { configured: true, provider: "NETGSM_SMS" } : { configured: false, provider: "NETGSM_SMS", reason: SMS_REASONS.NETGSM_NOT_CONFIGURED };
  }
  return isBrevoSmsConfigured() ? { configured: true, provider: "BREVO_SMS" } : { configured: false, provider: "BREVO_SMS", reason: SMS_REASONS.BREVO_NOT_CONFIGURED };
}

/** Is at least one SMS provider configured (for readiness — ignores per-recipient routing). */
export function isSmsConfigured(country?: string | null, phone?: string | null): boolean {
  return resolveSmsProvider(country, phone).configured;
}

export type SmsSendInput = { to: string; content: string; country?: string | null; sender?: string | null; type?: "transactional" | "marketing"; tag?: string | null };
export type SmsSendResult =
  | { ok: true; provider: SmsProviderId; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; provider: SmsProviderId; reason: string; detail?: string };

/** Send one SMS through the country-routed provider. No Twilio, no silent cross-provider fallback. */
export async function sendSmsMessage(input: SmsSendInput): Promise<SmsSendResult> {
  const route = resolveSmsProvider(input.country, input.to);
  if (!route.configured) return { ok: false, provider: route.provider, reason: route.reason };

  if (route.provider === "NETGSM_SMS") {
    const res = await sendNetgsmSms({ to: input.to, content: input.content }, input.country);
    return res.ok
      ? { ok: true, provider: "NETGSM_SMS", providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted }
      : { ok: false, provider: "NETGSM_SMS", reason: res.reason, detail: res.detail };
  }

  const res = await sendBrevoSms({ to: input.to, content: input.content, sender: input.sender, type: input.type, tag: input.tag });
  return res.ok
    ? { ok: true, provider: "BREVO_SMS", providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted }
    : { ok: false, provider: "BREVO_SMS", reason: res.reason, detail: res.detail };
}
