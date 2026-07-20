import { getActiveBrevoEmailRuntimeConfig, RUNTIME_FAILURE, type ActiveRuntimeConfig, type BrevoEmailRuntimeValues } from "../../runtime-config";
import { BREVO_EMAIL_REASONS, mapBrevoError, scrubBrevo } from "./errors";
import type { BrevoEmailInput, BrevoSendResult } from "./types";

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
export type BrevoEmailRuntimeConfig = ActiveRuntimeConfig<BrevoEmailRuntimeValues>;

function failureReason(cfg: BrevoEmailRuntimeConfig): string {
  if (cfg.configured) return BREVO_EMAIL_REASONS.NOT_CONFIGURED;
  if (cfg.reason === RUNTIME_FAILURE.PROVIDER_DISABLED) return "PROVIDER_DISABLED";
  if (cfg.reason === RUNTIME_FAILURE.INTEGRATION_DECRYPTION_FAILED) return "INTEGRATION_DECRYPTION_FAILED";
  if (cfg.reason === RUNTIME_FAILURE.INTEGRATION_DATABASE_UNAVAILABLE) return "INTEGRATION_DATABASE_UNAVAILABLE";
  return BREVO_EMAIL_REASONS.NOT_CONFIGURED;
}

export async function isBrevoEmailConfigured(runtime?: BrevoEmailRuntimeConfig): Promise<boolean> {
  return (runtime ?? await getActiveBrevoEmailRuntimeConfig()).configured;
}

export async function sendBrevoEmail(input: BrevoEmailInput, runtime?: BrevoEmailRuntimeConfig): Promise<BrevoSendResult> {
  const cfg = runtime ?? await getActiveBrevoEmailRuntimeConfig();
  if (!cfg.configured) return { ok: false, reason: failureReason(cfg) };
  const senderEmail = (input.senderEmail ?? cfg.values.senderEmail).trim();
  if (!senderEmail) return { ok: false, reason: BREVO_EMAIL_REASONS.SENDER_NOT_CONFIGURED };
  const senderName = (input.senderName ?? cfg.values.senderName).trim();
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
      headers: { "api-key": cfg.values.apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const { reason, detail } = mapBrevoError("email", res.status, body);
      return { ok: false, reason, detail };
    }
    const messageId = body && typeof body === "object" && typeof (body as { messageId?: unknown }).messageId === "string" ? (body as { messageId: string }).messageId : null;
    return { ok: true, providerMessageId: messageId, internalAccepted: messageId == null };
  } catch (error) {
    console.error("sendBrevoEmail failed", scrubBrevo(String(error)));
    return { ok: false, reason: BREVO_EMAIL_REASONS.REQUEST_FAILED };
  }
}
