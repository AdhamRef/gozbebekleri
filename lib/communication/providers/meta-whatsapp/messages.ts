import { getMetaConfig, graphFetch } from "./client";
import { META_REASONS } from "./errors";
import type { SendTemplateInput, SendResult } from "./types";

/**
 * Send an approved WhatsApp template message via the Cloud API.
 * POST /<PHONE_NUMBER_ID>/messages, type "template". Returns the wamid as providerMessageId.
 * Never throws; returns a safe reason on any failure. Real send only happens when configured.
 */
export async function sendTemplateMessage(input: SendTemplateInput): Promise<SendResult> {
  const config = getMetaConfig();
  if (!config) return { ok: false, reason: META_REASONS.NOT_CONFIGURED };
  if (!input.phoneNumberId) return { ok: false, reason: META_REASONS.SENDER_MISSING_PHONE_NUMBER_ID };

  const body = {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      ...(input.components && input.components.length ? { components: input.components } : {}),
    },
  };

  const result = await graphFetch(config, `${input.phoneNumberId}/messages`, { method: "POST", body: JSON.stringify(body) });
  if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };

  const data = (result.data ?? {}) as { messages?: { id?: unknown }[] };
  const id = data.messages?.[0]?.id;
  if (typeof id !== "string" || !id) return { ok: false, reason: META_REASONS.INVALID_RESPONSE };
  return { ok: true, providerMessageId: id };
}
