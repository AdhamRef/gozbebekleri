import { sendBrevoEmail, isBrevoEmailConfigured } from "../brevo/email-client";
import { BREVO_EMAIL_REASONS } from "../brevo/errors";

/**
 * Communication Center email provider. PRIMARY provider is now Brevo (see providers/brevo).
 *
 * SendGrid (`lib/email.ts`) is LEGACY and is NOT used as the primary send path. It can only run as an
 * explicit emergency fallback when `EMAIL_LEGACY_SENDGRID_FALLBACK=true` AND Brevo is not configured —
 * otherwise it is never called from here. The ProviderRouter treats Brevo as the email provider.
 */

// Reason codes kept stable for existing callers; they now map to the Brevo provider.
export const EMAIL_REASONS = {
  NOT_CONFIGURED: BREVO_EMAIL_REASONS.NOT_CONFIGURED, // "BREVO_EMAIL_NOT_CONFIGURED"
  SENDER_MISSING_IDENTITY: BREVO_EMAIL_REASONS.SENDER_NOT_CONFIGURED, // "BREVO_EMAIL_SENDER_NOT_CONFIGURED"
} as const;

const legacySendgridFallbackEnabled = () => process.env.EMAIL_LEGACY_SENDGRID_FALLBACK === "true";

/** Email is "configured" when Brevo is configured (or the legacy SendGrid fallback is explicitly on). */
export function isEmailConfigured(): boolean {
  if (isBrevoEmailConfigured()) return true;
  return legacySendgridFallbackEnabled() && !!process.env.SENDGRID_API_KEY;
}

export type EmailSendInput = { to: string; subject: string; html: string; text?: string | null; senderName?: string | null; senderEmail?: string | null };
export type EmailSendResult =
  | { ok: true; providerId: "BREVO_EMAIL" | "SENDGRID"; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; reason: string };

/** Send one rendered email — Brevo primary; SendGrid only as an explicit, flagged emergency fallback. */
export async function sendEmailMessage(input: EmailSendInput): Promise<EmailSendResult> {
  if (isBrevoEmailConfigured()) {
    const res = await sendBrevoEmail({ to: input.to, subject: input.subject, html: input.html, text: input.text, senderName: input.senderName, senderEmail: input.senderEmail });
    if (!res.ok) return { ok: false, reason: res.reason };
    return { ok: true, providerId: "BREVO_EMAIL", providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted };
  }

  // Legacy emergency fallback only — never the default primary path.
  if (legacySendgridFallbackEnabled() && process.env.SENDGRID_API_KEY) {
    const { sendBulkEmail } = await import("@/lib/email");
    const result = await sendBulkEmail([{ to: input.to, subject: input.subject, html: input.html }]);
    if (result.sent > 0) return { ok: true, providerId: "SENDGRID", providerMessageId: null, internalAccepted: true };
    return { ok: false, reason: result.failed[0]?.error ?? EMAIL_REASONS.NOT_CONFIGURED };
  }

  return { ok: false, reason: EMAIL_REASONS.NOT_CONFIGURED };
}
