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

export type PreparedSendInput = {
  channel: CommunicationChannelId;
  sender?: RouterSender | null;
  country?: string | null;
  to: string;
  // WhatsApp
  templateName?: string | null;
  languageCode?: string | null;
  components?: unknown[];
  // Email
  subject?: string | null;
  html?: string | null;
};

export type PreparedSendResult =
  | { ok: true; providerId: string; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; reason: string; detail?: string };

/**
 * Send a single prepared delivery through the real provider. Only reachable after the caller has
 * already created the CommunicationDelivery record. Never marks anything sent itself — it returns
 * the provider outcome for the caller to archive. WhatsApp = approved template only; Email = SendGrid
 * (no external id → internalAccepted); SMS = not implemented yet.
 */
export async function sendPreparedDelivery(input: PreparedSendInput): Promise<PreparedSendResult> {
  const decision = resolveProviderForSend(input.channel, input.sender, { country: input.country });
  if (!decision.canSend) return { ok: false, reason: decision.reason };

  if (input.channel === "WHATSAPP") {
    if (!input.sender?.phoneNumberId || !input.templateName || !input.languageCode) {
      return { ok: false, reason: META_REASONS.SENDER_MISSING_PHONE_NUMBER_ID };
    }
    const { sendTemplateMessage } = await import("./providers/meta-whatsapp/messages");
    const res = await sendTemplateMessage({
      phoneNumberId: input.sender.phoneNumberId,
      to: input.to,
      templateName: input.templateName,
      languageCode: input.languageCode,
      components: input.components,
    });
    if (!res.ok) return { ok: false, reason: res.reason, detail: res.detail };
    return { ok: true, providerId: "META_WHATSAPP", providerMessageId: res.providerMessageId, internalAccepted: false };
  }

  if (input.channel === "EMAIL") {
    const { sendEmailMessage } = await import("./providers/email/client");
    const res = await sendEmailMessage({ to: input.to, subject: input.subject ?? "", html: input.html ?? "" });
    if (!res.ok) return { ok: false, reason: res.reason };
    // SendGrid returns no per-message id here → accepted marker, providerMessageId stays null.
    return { ok: true, providerId: "SENDGRID", providerMessageId: null, internalAccepted: true };
  }

  // SMS send executor is not implemented yet.
  return { ok: false, reason: "SMS_SEND_NOT_IMPLEMENTED" };
}
