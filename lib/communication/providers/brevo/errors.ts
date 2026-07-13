/**
 * Safe error codes for the Brevo email/SMS adapters. Never leak the API key or any secret in
 * messages/logs — provider bodies are reduced to a safe code + short scrubbed detail.
 */

export const BREVO_EMAIL_REASONS = {
  NOT_CONFIGURED: "BREVO_EMAIL_NOT_CONFIGURED",
  SENDER_NOT_CONFIGURED: "BREVO_EMAIL_SENDER_NOT_CONFIGURED",
  REQUEST_FAILED: "BREVO_EMAIL_REQUEST_FAILED",
  INVALID_RESPONSE: "BREVO_EMAIL_INVALID_RESPONSE",
  UNAUTHORIZED: "BREVO_EMAIL_UNAUTHORIZED",
} as const;

export const BREVO_SMS_REASONS = {
  NOT_CONFIGURED: "BREVO_SMS_NOT_CONFIGURED",
  REQUEST_FAILED: "BREVO_SMS_REQUEST_FAILED",
  INVALID_RESPONSE: "BREVO_SMS_INVALID_RESPONSE",
  UNAUTHORIZED: "BREVO_SMS_UNAUTHORIZED",
} as const;

/** Remove anything api-key/token-shaped before logging/storing. */
export function scrubBrevo(input: string): string {
  return input
    .replace(/xkeysib-[A-Za-z0-9-]+/gi, "***")
    .replace(/api-key[:=]\s*[^&\s"']+/gi, "api-key=***")
    .slice(0, 300);
}

export function mapBrevoError(kind: "email" | "sms", status: number, body: unknown): { reason: string; detail: string } {
  const REASONS = kind === "email" ? BREVO_EMAIL_REASONS : BREVO_SMS_REASONS;
  let message = "";
  if (body && typeof body === "object") {
    const m = (body as { message?: unknown; code?: unknown }).message;
    if (typeof m === "string") message = m;
  } else if (typeof body === "string") {
    message = body;
  }
  const reason = status === 401 || status === 403 ? REASONS.UNAUTHORIZED : REASONS.REQUEST_FAILED;
  return { reason, detail: scrubBrevo(`${status}: ${message}`) };
}
