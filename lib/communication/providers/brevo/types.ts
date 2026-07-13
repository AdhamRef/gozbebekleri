/** Shared types for the Brevo email + SMS adapters. */

export type BrevoEmailInput = {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  templateId?: number | null;
  params?: Record<string, unknown> | null;
};

export type BrevoSmsInput = {
  to: string;
  content: string;
  sender?: string | null;
  type?: "transactional" | "marketing";
  tag?: string | null;
  webUrl?: string | null;
};

export type BrevoSendResult =
  | { ok: true; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; reason: string; detail?: string };
