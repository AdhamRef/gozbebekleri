import { prisma } from "@/lib/prisma";
import { decryptCard, encryptCard } from "@/lib/card-crypto";

/**
 * Short-lived, encrypted copy of the card a donor used for a PayFor 3D attempt,
 * so that if PayFor fails the same card can be charged on Stripe automatically.
 *
 * Lifetime rules (all enforced here):
 *   - written once per PayFor initiate (replacing any earlier row for the donation)
 *   - consumed (read + deleted) exactly once by the Stripe fallback
 *   - discarded when PayFor succeeds
 *   - unusable after FALLBACK_CARD_TTL_MS, and swept on every write
 *
 * Never log a FallbackCard or its payload.
 */

/** Covers the bank's 3D Secure step (SMS OTP can take a few minutes) with headroom. */
const FALLBACK_CARD_TTL_MS = 20 * 60 * 1000;

export type FallbackCard = {
  number: string;
  expMonth: number;
  /** Four-digit year. */
  expYear: number;
  cvc: string;
  holder: string | null;
};

/**
 * Parse loosely-shaped card input from the browser or a saved-card row.
 * Returns null when it isn't a usable card, so callers simply skip the fallback.
 */
export function parseFallbackCard(input: {
  number?: unknown;
  expiry?: unknown;
  cvc?: unknown;
  holder?: unknown;
}): FallbackCard | null {
  const number = typeof input.number === "string" ? input.number.replace(/\D/g, "") : "";
  const cvc = typeof input.cvc === "string" ? input.cvc.replace(/\D/g, "") : "";
  const expiryDigits = typeof input.expiry === "string" ? input.expiry.replace(/\D/g, "") : "";
  if (number.length < 12 || number.length > 19) return null;
  if (cvc.length < 3 || cvc.length > 4) return null;
  // Accept MMYY or MMYYYY.
  if (expiryDigits.length !== 4 && expiryDigits.length !== 6) return null;
  const expMonth = Number(expiryDigits.slice(0, 2));
  const yearPart = Number(expiryDigits.slice(2));
  const expYear = expiryDigits.length === 4 ? 2000 + yearPart : yearPart;
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return null;
  const holder = typeof input.holder === "string" && input.holder.trim() ? input.holder.trim().slice(0, 100) : null;
  return { number, expMonth, expYear, cvc, holder };
}

export async function stashFallbackCard(donationId: string, card: FallbackCard): Promise<void> {
  const now = new Date();
  await prisma.paymentFallbackCard.deleteMany({
    where: { OR: [{ donationId }, { expiresAt: { lt: now } }] },
  });
  await prisma.paymentFallbackCard.create({
    data: {
      donationId,
      payload: encryptCard(JSON.stringify(card)),
      expiresAt: new Date(now.getTime() + FALLBACK_CARD_TTL_MS),
    },
  });
}

/**
 * Read and delete the stashed card. Returns null when there is none, it expired,
 * or another request already consumed it — so the fallback can run at most once.
 */
export async function consumeFallbackCard(donationId: string): Promise<FallbackCard | null> {
  const row = await prisma.paymentFallbackCard.findFirst({
    where: { donationId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  // deleteMany's count tells us whether *this* request won the row; a concurrent
  // PayFor callback (ok + fail can both arrive) gets 0 and does not charge again.
  const { count } = await prisma.paymentFallbackCard.deleteMany({ where: { id: row.id } });
  if (count === 0) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  try {
    return JSON.parse(decryptCard(row.payload)) as FallbackCard;
  } catch {
    return null;
  }
}

export async function discardFallbackCard(donationId: string): Promise<void> {
  await prisma.paymentFallbackCard.deleteMany({ where: { donationId } });
}
