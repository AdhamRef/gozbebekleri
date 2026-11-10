import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// Independent from NEXTAUTH_SECRET / AUTH_SECRET. The FIRST key signs new grants;
// the other keys verify old grants only during rotation. Protected env only.
// GOZ_GUEST_PAYMENT_KEYS=kid:base64url(32+ bytes),previous:base64url(32+ bytes)
export const GUEST_PAYMENT_TTL_SECONDS = 60 * 60;
const COOKIE_PREFIX = "goz_guest_charge_";
const DONATION_ID = /^[a-f\\d]{24}$/i;
const KEY_ID = /^[a-zA-Z0-9_-]{1,24}$/;

type SigningKey = { id: string; secret: Buffer };
function paymentKeys(): SigningKey[] {
  const raw = process.env.GOZ_GUEST_PAYMENT_KEYS || "";
  if (!raw) return [];
  const entries = raw.split(",");
  if (entries.length > 4) return [];
  const result: SigningKey[] = [];
  for (const entry of entries) {
    const pair = entry.trim().split(":");
    if (pair.length !== 2 || !KEY_ID.test(pair[0]) ||
        !/^[a-zA-Z0-9_-]{43,}$/.test(pair[1]) ||
        result.some(k => k.id === pair[0])) return [];
    const secret = Buffer.from(pair[1], "base64url");
    if (secret.length < 32) return [];
    result.push({ id: pair[0], secret });
  }
  return result;
}
export function canIssueGuestPaymentGrant(): boolean {
  return paymentKeys().length > 0;
}
function signature(donationId: string, expiresAt: number, secret: Buffer): Buffer {
  return createHmac("sha256", secret)
    .update("gozbebekleri:one-time-charge:v2:" + donationId + ":" + expiresAt)
    .digest();
}
export function guestPaymentCookieName(donationId: string): string {
  return COOKIE_PREFIX + donationId;
}
export function issueGuestPaymentGrant(response: NextResponse, donationId: string): void {
  const active = paymentKeys()[0];
  if (!active || !DONATION_ID.test(donationId)) {
    throw new Error("Guest payment grant signing key unavailable");
  }
  const expiresAt = Math.floor(Date.now() / 1000) + GUEST_PAYMENT_TTL_SECONDS;
  response.cookies.set({
    name: guestPaymentCookieName(donationId),
    value: active.id + "." + expiresAt + "." +
      signature(donationId, expiresAt, active.secret).toString("hex"),
    maxAge: GUEST_PAYMENT_TTL_SECONDS,
    path: "/api/stripe/charge",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
export function hasGuestPaymentGrant(request: NextRequest, donationId: string): boolean {
  if (!DONATION_ID.test(donationId)) return false;
  const value = request.cookies.get(guestPaymentCookieName(donationId))?.value;
  if (!value) return false;
  const match = /^([a-zA-Z0-9_-]{1,24})\\.(\\d{10})\\.([0-9a-f]{64})$/.exec(value);
  if (!match) return false;
  const expiresAt = Number(match[2]), now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + GUEST_PAYMENT_TTL_SECONDS) return false;
  const key = paymentKeys().find(k => k.id === match[1]);
  if (!key) return false;
  return timingSafeEqual(
    Buffer.from(match[3], "hex"),
    signature(donationId, expiresAt, key.secret),
  );
}
