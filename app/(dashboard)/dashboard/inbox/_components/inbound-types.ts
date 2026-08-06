import type { MessageSubject } from "@/lib/messages/subjects";

/** One row from `GET /api/admin/messages`, after the route decodes the legacy `[SUBJECT:…]` prefix. */
export interface InboundMessage {
  id: string;
  body: string;
  subject: MessageSubject;
  locale: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

/** Who wrote it, resolved once so the card and the dialog cannot disagree. */
export function senderOf(m: InboundMessage) {
  const name = m.user?.name ?? m.guestName ?? null;
  const email = m.user?.email ?? m.guestEmail ?? null;
  return {
    name,
    email,
    image: m.user?.image ?? null,
    isRegistered: !!m.user,
    /** Falls back through name → email → a neutral glyph, never an empty circle. */
    initial: (name ?? email ?? "؟").trim().charAt(0).toUpperCase() || "؟",
    displayName: name ?? email ?? "زائر",
  };
}

const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * "منذ ٣ أيام" instead of a bare date.
 *
 * An inbox is read by recency — whether a message arrived today or in March is the first thing
 * you want, and a formatted date makes you compute that yourself. The absolute date is still
 * available on hover and in the dialog, so nothing is lost.
 *
 * Client-only by construction (the list is fetched in the browser), so there is no
 * server/client clock mismatch to hydrate around.
 */
export function relativeTime(iso: string): string {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const abs = Math.abs(diff);
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "الآن";
}

export function absoluteDate(iso: string, style: "medium" | "long" = "medium"): string {
  return new Date(iso).toLocaleString("ar-EG", { dateStyle: style, timeStyle: "short" });
}
