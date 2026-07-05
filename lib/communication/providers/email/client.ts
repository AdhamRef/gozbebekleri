import { sendBulkEmail } from "@/lib/email";

/**
 * Email provider client for the Communication Center. Wraps the existing SendGrid path
 * (`lib/email.ts`) behind the ProviderRouter. Server-only; the API key is read inside `lib/email.ts`
 * and never surfaced here. Real sending only happens when SENDGRID_API_KEY is configured; the legacy
 * `lib/email.ts` now records EMAIL_PROVIDER_NOT_CONFIGURED (never a fake sent) when it is missing.
 */

export const EMAIL_REASONS = {
  NOT_CONFIGURED: "EMAIL_PROVIDER_NOT_CONFIGURED",
  SENDER_MISSING_IDENTITY: "EMAIL_SENDER_MISSING_IDENTITY",
} as const;

export function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

export type EmailSendInput = { to: string; subject: string; html: string };
export type EmailSendResult = { ok: true; accepted: number } | { ok: false; reason: string };

/** Send one rendered email via the existing SendGrid path. Returns a safe reason when not configured. */
export async function sendEmailMessage(input: EmailSendInput): Promise<EmailSendResult> {
  if (!isEmailConfigured()) return { ok: false, reason: EMAIL_REASONS.NOT_CONFIGURED };
  const result = await sendBulkEmail([{ to: input.to, subject: input.subject, html: input.html }]);
  if (result.sent > 0) return { ok: true, accepted: result.sent };
  return { ok: false, reason: result.failed[0]?.error ?? EMAIL_REASONS.NOT_CONFIGURED };
}
