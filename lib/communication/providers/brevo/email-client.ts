import { getBrevoEmailConfig } from "../../provider-env";
import { BREVO_EMAIL_REASONS, mapBrevoError, scrubBrevo } from "./errors";
import type { BrevoEmailInput, BrevoSendResult } from "./types";

/**
 * Brevo transactional email adapter (the primary Communication email provider). Server-only:
 * BREVO_API_KEY is read here and never surfaced. Never marks a send successful without a real Brevo
 * acceptance (2xx). On success stores Brevo `messageId` as the delivery providerMessageId.
 */

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export function isBrevoEmailConfigured(): boolean {
  return getBrevoEmailConfig().configured;
}

export async function sendBrevoEmail(input: BrevoEmailInput): Promise<BrevoSendResult> {
  const cfg = getBrevoEmailConfig();
  if (!process.env.BREVO_API_KEY?.trim()) return { ok: false, reason: BREVO_EMAIL_REASONS.NOT_CONFIGURED };
  const senderEmail = (input.senderEmail ?? process.env.BREVO_EMAIL_SENDER_EMAIL ?? "").trim();
  if (!senderEmail) return { ok: false, reason: BREVO_EMAIL_REASONS.SENDER_NOT_CONFIGURED };
  if (!cfg.configured) return { ok: false, reason: BREVO_EMAIL_REASONS.NOT_CONFIGURED };

  const senderName = (input.senderName ?? process.env.BREVO_EMAIL_SENDER_NAME ?? "").trim();
  const payload: Record<string, unknown> = {
    sender: senderName ? { name: senderName, email: senderEmail } : { email: senderEmail },
    to: [input.toName ? { email: input.to, name: input.toName } : { email: input.to }],
    subject: input.subject,
  };
  if (input.templateId) payload.templateId = input.templateId;
  if (input.html) payload.htmlContent = input.html;
  if (input.text) payload.textContent = input.text;
  if (input.params) payload.params = input.params;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY.trim(), "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const { reason, detail } = mapBrevoError("email", res.status, body);
      return { ok: false, reason, detail };
    }
    const messageId = body && typeof body === "object" && typeof (body as { messageId?: unknown }).messageId === "string" ? (body as { messageId: string }).messageId : null;
    // A 2xx with no id is still a genuine Brevo acceptance → internalAccepted (never a fake sent).
    return { ok: true, providerMessageId: messageId, internalAccepted: messageId == null };
  } catch (error) {
    console.error("sendBrevoEmail failed", scrubBrevo(String(error)));
    return { ok: false, reason: BREVO_EMAIL_REASONS.REQUEST_FAILED };
  }
}
