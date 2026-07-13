import type { CommunicationChannelId } from "./communication-runtime-types";
import { isMetaConfigured } from "./providers/meta-whatsapp/client";
import { META_REASONS } from "./providers/meta-whatsapp/errors";
import { isEmailConfigured, EMAIL_REASONS } from "./providers/email/client";
import { resolveSmsProvider, sendSmsMessage } from "./providers/sms/client";

/**
 * ProviderRouter — the single gate for turning a prepared delivery into a real provider send.
 *
 * FINAL ARCHITECTURE:
 *   - WhatsApp → Meta WhatsApp Cloud API (only). Never Twilio.
 *   - Email    → Brevo (primary). SendGrid legacy only (behind a flag, never primary).
 *   - SMS      → Turkish (+90 / TR) → Netgsm; all others → Brevo SMS. Never Twilio.
 *
 * No silent cross-provider fallback. Real sending only happens with credentials (and a WhatsApp
 * sender with a phoneNumberId); otherwise the caller must record SKIPPED/FAILED with the reason and
 * must NEVER mark a delivery SENT.
 */

export type ProviderSendDecision =
  | { canSend: false; reason: string }
  | { canSend: true; providerId: string };

export type RouterSender = { provider?: string | null; phoneNumberId?: string | null; senderEmail?: string | null; smsSender?: string | null };
export type RouterContext = { country?: string | null; phone?: string | null };

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
    if (!sender?.senderEmail && !process.env.BREVO_EMAIL_SENDER_EMAIL?.trim()) return { canSend: false, reason: EMAIL_REASONS.SENDER_MISSING_IDENTITY };
    return { canSend: true, providerId: "BREVO_EMAIL" };
  }
  // SMS — country/phone-routed (TR → Netgsm, else Brevo), config-gated. Never Twilio.
  const sms = resolveSmsProvider(ctx?.country, ctx?.phone);
  if (!sms.configured) return { canSend: false, reason: sms.reason };
  return { canSend: true, providerId: sms.provider };
}

/** Is any real send possible for this channel right now (ignoring sender specifics)? */
export function isSendEnabled(channel: CommunicationChannelId): boolean {
  if (channel === "WHATSAPP") return isMetaConfigured();
  if (channel === "EMAIL") return isEmailConfigured();
  // SMS is "enabled" if either provider is configured (per-recipient routing decides which).
  return resolveSmsProvider("", "").configured || resolveSmsProvider("TR", "+90").configured;
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
  text?: string | null;
};

export type PreparedSendResult =
  | { ok: true; provider: string; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; provider?: string; reason: string; detail?: string };

/**
 * Send a single prepared delivery through the real provider. Only reachable after the caller has
 * already created the CommunicationDelivery record. Never marks anything sent itself — it returns the
 * provider outcome for the caller to archive. WhatsApp = approved template only; Email = Brevo;
 * SMS = Netgsm (TR) / Brevo (international). No Twilio anywhere; no silent fallback.
 */
export async function sendPreparedDelivery(input: PreparedSendInput): Promise<PreparedSendResult> {
  const decision = resolveProviderForSend(input.channel, input.sender, { country: input.country, phone: input.to });
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
    if (!res.ok) return { ok: false, provider: "META_WHATSAPP", reason: res.reason, detail: res.detail };
    return { ok: true, provider: "META_WHATSAPP", providerMessageId: res.providerMessageId, internalAccepted: false };
  }

  if (input.channel === "EMAIL") {
    const { sendEmailMessage } = await import("./providers/email/client");
    const res = await sendEmailMessage({ to: input.to, subject: input.subject ?? "", html: input.html ?? "", text: input.text, senderEmail: input.sender?.senderEmail });
    if (!res.ok) return { ok: false, provider: "BREVO_EMAIL", reason: res.reason };
    return { ok: true, provider: res.providerId, providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted };
  }

  // SMS — content is the rendered body; country/phone decides Netgsm vs Brevo.
  const res = await sendSmsMessage({ to: input.to, content: input.html ?? input.subject ?? "", country: input.country, sender: input.sender?.smsSender, tag: "communication" });
  if (!res.ok) return { ok: false, provider: res.provider, reason: res.reason, detail: res.detail };
  return { ok: true, provider: res.provider, providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted };
}
