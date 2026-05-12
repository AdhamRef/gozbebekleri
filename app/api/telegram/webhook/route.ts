import { NextRequest, NextResponse } from "next/server";
import { getTelegramConfig } from "@/lib/telegram/config";
import { dispatchTelegramCommand } from "@/lib/telegram/commands";

/**
 * Telegram webhook receiver.
 *
 * Security: we registered the webhook with `secret_token` set. Telegram echoes
 * that value back as `X-Telegram-Bot-Api-Secret-Token` on every call. We
 * compare it before doing anything — that's how we know the caller is really
 * Telegram (and not a random script that found this URL).
 *
 * Behavior: always returns 200 fast. The bot work runs after we ack so a slow
 * DB query never causes Telegram to retry-storm.
 */
export async function POST(req: NextRequest) {
  const cfg = getTelegramConfig();
  if (!cfg) {
    // Don't reveal that we're misconfigured — just 200 so Telegram backs off.
    return NextResponse.json({ ok: true });
  }

  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== cfg.webhookSecret) {
    console.warn("[telegram webhook] bad secret header");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: Record<string, unknown> | null = null;
  try {
    update = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message =
    (update?.message as Record<string, unknown> | undefined) ??
    (update?.edited_message as Record<string, unknown> | undefined) ??
    null;
  if (!message) return NextResponse.json({ ok: true });

  const chat = message.chat as { id?: number | string } | undefined;
  const from = message.from as { id?: number | string } | undefined;
  const text = typeof message.text === "string" ? message.text : "";
  const messageId = typeof message.message_id === "number" ? message.message_id : undefined;

  if (!chat?.id || !text) return NextResponse.json({ ok: true });

  // Fire-and-forget: do not await. Telegram only retries on non-2xx.
  void dispatchTelegramCommand({
    chatId: chat.id,
    fromChatId: chat.id,
    text,
    messageId,
  }).catch((err) => {
    console.error("[telegram webhook] dispatch threw:", err, "from user:", from?.id);
  });

  return NextResponse.json({ ok: true });
}

// Telegram never sends GET. Reject it with a friendly hint so curl-testers know the URL is alive.
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: "Telegram webhook endpoint. POSTs from Telegram only; verify with X-Telegram-Bot-Api-Secret-Token header.",
  });
}
