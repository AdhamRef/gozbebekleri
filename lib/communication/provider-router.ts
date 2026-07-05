import type { CommunicationChannelId } from "./communication-runtime-types";
import { isMetaConfigured } from "./providers/meta-whatsapp/client";
import { META_REASONS } from "./providers/meta-whatsapp/errors";
import { isEmailConfigured, EMAIL_REASONS } from "./providers/email/client";
import { resolveSmsProvider } from "./providers/sms/client";

/**
 * ProviderRouter — the single gate for turning a prepared delivery into a real provider send.
 *
 * WhatsApp is wired to the Meta WhatsApp Cloud API adapter. Email/SMS adapters are not built yet,
 * so those channels remain not-configured. Real sending only happens when credentials AND a sender
 * with a phoneNumberId are present; otherwise the caller must record SKIPPED/FAILED with the reason
 * and must never mark a delivery SENT.
 */

export type ProviderSendDecision =
  | { canSend: false; reason: string }
  | { canSend: true; providerId: string };

export type RouterSender = { provider?: string | null; phoneNumberId?: string | null; senderEmail?: string | null; smsSender?: string | null };
export type RouterContext = { country?: string | null };

export function providerNotConfiguredReason(channel: CommunicationChannelId): string {
  if (channel === "WHATSAPP") return META_REASONS.NOT_CONFIGURED;
  if (channel === "EMAIL") return EMAIL_REASONS.NOT_CONFIGURED;
  return "SMS_PROVIDER_NOT_CONFIGURED";
}

/** Whether a real send can happen for a channel + (optional) selected sender + context. */
export function resolveProviderForSend(channel: CommunicationChannelId, sender?: RouterSender | null, ctx?: RouterContext): ProviderSendDecision {
  if (channel === "WHATSAPP") {
    if (!isMetaConfigured()) return { canSend: false, reason: META_REASONS.NOT_CONFIGURED };
    if (!sender?.phoneNumberId) return { canSend: false, reason: META_REASONS.SENDER_MISSING_PHONE_NUMBER_ID };
    return { canSend: true, providerId: "META_WHATSAPP" };
  }
  if (channel === "EMAIL") {
    if (!isEmailConfigured()) return { canSend: false, reason: EMAIL_REASONS.NOT_CONFIGURED };
    if (!sender?.senderEmail) return { canSend: false, reason: EMAIL_REASONS.SENDER_MISSING_IDENTITY };
    return { canSend: true, providerId: "SENDGRID" };
  }
  // SMS — country-routed (TR → Netgsm, else Twilio), config-gated.
  const sms = resolveSmsProvider(ctx?.country);
  if (!sms.configured) return { canSend: false, reason: sms.reason };
  return { canSend: true, providerId: sms.provider };
}

/** Is any real send possible for this channel right now (ignoring sender specifics)? */
export function isSendEnabled(channel: CommunicationChannelId): boolean {
  if (channel === "WHATSAPP") return isMetaConfigured();
  if (channel === "EMAIL") return isEmailConfigured();
  return resolveSmsProvider(null).configured;
}
