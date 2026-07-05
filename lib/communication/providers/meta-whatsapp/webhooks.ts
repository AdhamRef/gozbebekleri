import { createHmac, timingSafeEqual } from "crypto";
import { getMetaConfig } from "./client";
import type { NormalizedWebhookEvent } from "./types";

/**
 * Meta webhook helpers — verification handshake, payload signature check, and safe payload
 * parsing/normalization. Only sanitized fields are surfaced; raw payload and secrets never leave here.
 */

/** GET verification: returns the challenge to echo when the verify token matches, else null. */
export function verifyWebhookChallenge(mode: string | null, token: string | null, challenge: string | null): string | null {
  const config = getMetaConfig();
  const expected = config?.verifyToken;
  if (mode === "subscribe" && expected && token === expected && challenge) return challenge;
  return null;
}

/**
 * Validate the X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with the app secret).
 * Returns "valid" | "invalid" | "unconfigured" (no app secret → cannot verify).
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): "valid" | "invalid" | "unconfigured" {
  const config = getMetaConfig();
  if (!config?.appSecret) return "unconfigured";
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return "invalid";
  const provided = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", config.appSecret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(provided, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return "invalid";
    return timingSafeEqual(a, b) ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function mapStatus(status: string): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
  switch (status) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    default:
      return null;
  }
}

function firstErrorMessage(errors: unknown): string | null {
  if (Array.isArray(errors) && errors[0] && typeof errors[0] === "object") {
    const e = errors[0] as { title?: unknown; message?: unknown; code?: unknown };
    const text = (typeof e.message === "string" && e.message) || (typeof e.title === "string" && e.title) || "";
    return text ? String(text).slice(0, 300) : null;
  }
  return null;
}

/**
 * Parse a WhatsApp webhook body into normalized status + inbound events. Idempotency keys are
 * derived from the wamid + kind (+ status) so re-delivered webhooks are de-duplicated downstream.
 */
export function parseWebhookPayload(payload: unknown): NormalizedWebhookEvent[] {
  const out: NormalizedWebhookEvent[] = [];
  const root = payload as { object?: unknown; entry?: unknown[] } | null;
  if (!root || root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return out;

  for (const entry of root.entry) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      if (!value || typeof value !== "object") continue;
      const metadata = value.metadata as { phone_number_id?: unknown } | undefined;
      const phoneNumberId = typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : null;

      const contacts = Array.isArray(value.contacts) ? (value.contacts as Record<string, unknown>[]) : [];
      const profileName = (() => {
        const p = contacts[0]?.profile as { name?: unknown } | undefined;
        return typeof p?.name === "string" ? p.name : null;
      })();

      // Outbound status events
      const statuses = Array.isArray(value.statuses) ? (value.statuses as Record<string, unknown>[]) : [];
      for (const s of statuses) {
        const wamid = typeof s.id === "string" ? s.id : null;
        const mapped = typeof s.status === "string" ? mapStatus(s.status) : null;
        if (!wamid || !mapped) continue;
        out.push({
          kind: "status",
          providerMessageId: wamid,
          status: mapped,
          recipient: typeof s.recipient_id === "string" ? s.recipient_id : null,
          phoneNumberId,
          timestamp: toNumber(s.timestamp),
          errorMessage: mapped === "FAILED" ? firstErrorMessage(s.errors) : null,
          idempotencyKey: `wa:status:${wamid}:${mapped}`,
        });
      }

      // Inbound user messages
      const messages = Array.isArray(value.messages) ? (value.messages as Record<string, unknown>[]) : [];
      for (const m of messages) {
        const wamid = typeof m.id === "string" ? m.id : null;
        if (!wamid) continue;
        const type = typeof m.type === "string" ? m.type : null;
        const text = type === "text" ? (m.text as { body?: unknown })?.body : undefined;
        out.push({
          kind: "inbound",
          providerMessageId: wamid,
          from: typeof m.from === "string" ? m.from : null,
          profileName,
          phoneNumberId,
          text: typeof text === "string" ? text.slice(0, 4000) : null,
          messageType: type,
          timestamp: toNumber(m.timestamp),
          idempotencyKey: `wa:inbound:${wamid}`,
        });
      }
    }
  }
  return out;
}
