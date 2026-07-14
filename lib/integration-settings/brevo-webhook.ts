import { randomBytes, timingSafeEqual } from "node:crypto";
import { getCanonicalApplicationUrl } from "./canonical-url";

export function generateBrevoWebhookToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildBrevoWebhookUrl(token: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${getCanonicalApplicationUrl(env)}/api/webhooks/brevo/transactional?token=${encodeURIComponent(token)}`;
}

export function resolveBrevoWebhookSecret(activeDatabaseValue: string | null | undefined, env: NodeJS.ProcessEnv = process.env): string | null {
  return activeDatabaseValue || env.BREVO_SMS_WEBHOOK_SECRET?.trim() || null;
}

export function brevoWebhookTokenMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
