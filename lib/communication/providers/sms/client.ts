/**
 * SMS provider routing for the Communication Center. Turkey (TR) routes to Netgsm; other countries
 * route to Twilio international SMS. Both are config-gated — with no credentials, SMS is not
 * configured and nothing is sent (SMS_PROVIDER_NOT_CONFIGURED). Server-only; no secrets exposed.
 *
 * Adapters are intentionally thin config resolvers for this package: sending SMS is not enabled
 * until credentials exist and a send executor is wired, so no external SMS call is made here.
 */

export const SMS_REASONS = {
  NOT_CONFIGURED: "SMS_PROVIDER_NOT_CONFIGURED",
} as const;

export type SmsProviderId = "NETGSM" | "TWILIO";

export function isNetgsmConfigured(): boolean {
  return !!(process.env.NETGSM_USERCODE && (process.env.NETGSM_PASSWORD || process.env.NETGSM_APIKEY));
}

export function isTwilioSmsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_SMS_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID));
}

export type SmsRouteResult = { configured: true; provider: SmsProviderId } | { configured: false; reason: string };

/** Pick the SMS provider for a recipient country: TR → Netgsm, otherwise Twilio international. */
export function resolveSmsProvider(country?: string | null): SmsRouteResult {
  const c = (country ?? "").trim().toUpperCase();
  if (c === "TR") {
    return isNetgsmConfigured() ? { configured: true, provider: "NETGSM" } : { configured: false, reason: SMS_REASONS.NOT_CONFIGURED };
  }
  return isTwilioSmsConfigured() ? { configured: true, provider: "TWILIO" } : { configured: false, reason: SMS_REASONS.NOT_CONFIGURED };
}

export function isSmsConfigured(country?: string | null): boolean {
  return resolveSmsProvider(country).configured;
}
