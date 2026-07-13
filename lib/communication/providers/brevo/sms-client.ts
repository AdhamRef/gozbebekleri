import { getBrevoSmsConfig, brevoSmsDefaultType } from "../../provider-env";
import { BREVO_SMS_REASONS, mapBrevoError, scrubBrevo } from "./errors";
import type { BrevoSmsInput, BrevoSendResult } from "./types";

/**
 * Brevo transactional SMS adapter — the default for NON-Turkish (international) numbers. Server-only:
 * BREVO_API_KEY read here, never surfaced. Arabic/Turkish content sends with unicodeEnabled so
 * characters are preserved. Never falls back to Twilio; on failure it returns a safe reason.
 */

const BREVO_SMS_ENDPOINT = "https://api.brevo.com/v3/transactionalSMS/sms";

export function isBrevoSmsConfigured(): boolean {
  return getBrevoSmsConfig().configured;
}

export async function sendBrevoSms(input: BrevoSmsInput): Promise<BrevoSendResult> {
  const cfg = getBrevoSmsConfig();
  if (!process.env.BREVO_API_KEY?.trim()) return { ok: false, reason: BREVO_SMS_REASONS.NOT_CONFIGURED };
  const sender = (input.sender ?? process.env.BREVO_SMS_SENDER ?? "").trim();
  if (!sender || !cfg.configured) return { ok: false, reason: BREVO_SMS_REASONS.NOT_CONFIGURED };

  const payload: Record<string, unknown> = {
    sender,
    recipient: input.to,
    content: input.content,
    type: input.type ?? brevoSmsDefaultType(),
    unicodeEnabled: true, // preserve Arabic / Turkish characters
  };
  if (input.tag) payload.tag = input.tag;
  if (input.webUrl) payload.webUrl = input.webUrl;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(BREVO_SMS_ENDPOINT, {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY.trim(), "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const { reason, detail } = mapBrevoError("sms", res.status, body);
      return { ok: false, reason, detail };
    }
    const idRaw = body && typeof body === "object" ? (body as { messageId?: unknown; reference?: unknown }).messageId ?? (body as { reference?: unknown }).reference : null;
    const messageId = typeof idRaw === "string" ? idRaw : typeof idRaw === "number" ? String(idRaw) : null;
    return { ok: true, providerMessageId: messageId, internalAccepted: messageId == null };
  } catch (error) {
    console.error("sendBrevoSms failed", scrubBrevo(String(error)));
    return { ok: false, reason: BREVO_SMS_REASONS.REQUEST_FAILED };
  }
}
