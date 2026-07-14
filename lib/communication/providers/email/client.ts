import type { BrevoEmailRuntimeConfig } from "../brevo/email-client";
import { sendBrevoEmail, isBrevoEmailConfigured } from "../brevo/email-client";
import { BREVO_EMAIL_REASONS } from "../brevo/errors";

export const EMAIL_REASONS = {
  NOT_CONFIGURED: BREVO_EMAIL_REASONS.NOT_CONFIGURED,
  SENDER_MISSING_IDENTITY: BREVO_EMAIL_REASONS.SENDER_NOT_CONFIGURED,
} as const;

export async function isEmailConfigured(runtime?: BrevoEmailRuntimeConfig): Promise<boolean> {
  return isBrevoEmailConfigured(runtime);
}

export type EmailSendInput = { to: string; subject: string; html: string; text?: string | null; senderName?: string | null; senderEmail?: string | null };
export type EmailSendResult =
  | { ok: true; providerId: "BREVO_EMAIL"; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; reason: string };

export async function sendEmailMessage(input: EmailSendInput, runtime?: BrevoEmailRuntimeConfig): Promise<EmailSendResult> {
  const res = await sendBrevoEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    senderName: input.senderName,
    senderEmail: input.senderEmail,
  }, runtime);
  if (!res.ok) return { ok: false, reason: res.reason };
  return { ok: true, providerId: "BREVO_EMAIL", providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted };
}
