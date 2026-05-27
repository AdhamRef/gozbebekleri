"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  fireGoogleAdsDonationConversion,
  fireTikTokDonationConversion,
  fireXDonationConversion,
  type PublicTrackingConfig,
} from "@/lib/tracking/browser-conversions";

type DonateTrackingPayload = {
  ok: true;
  eventId: string;
  transactionId: string;
  value: number;
  currency: string;
  contentIds?: string[];
  contentName?: string;
  contents?: Array<{ id: string; quantity: number; item_price: number }>;
  numItems?: number;
};

type FbqFn = (command: string, eventName: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;

declare global {
  interface Window { fbq?: FbqFn; }
}

const MAX_ATTEMPTS = 20;
const RETRY_MS = 750;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function donationIdFromPath(pathname: string | null) {
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("success");
  return index >= 0 ? parts[index + 1] ?? null : null;
}

async function logMetaBrowser(payload: DonateTrackingPayload, status: "SENT" | "FAILED" | "SKIPPED", error?: string) {
  try {
    await fetch(`/api/donations/${encodeURIComponent(payload.transactionId)}/track-browser-conversion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        platform: "META",
        eventName: "Donate",
        eventId: payload.eventId,
        value: payload.value,
        currency: payload.currency,
        status,
        error,
      }),
    });
  } catch {}
}

function fireMetaBrowserDonate(payload: DonateTrackingPayload): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "window unavailable" };
  if (typeof window.fbq !== "function") return { ok: false, error: "fbq unavailable" };
  try {
    window.fbq("track", "Donate", {
      value: payload.value,
      currency: payload.currency,
      content_type: "donation",
      content_name: payload.contentName,
      content_ids: payload.contentIds,
      contents: payload.contents,
      num_items: payload.numItems,
      order_id: payload.transactionId,
      transaction_id: payload.transactionId,
      status: "paid",
      success: true,
      donation_type: "one_time",
      payment_method: "card",
    }, { eventID: payload.eventId });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "fbq failed" };
  }
}

export function SuccessFinalConversionTracker() {
  const pathname = usePathname();
  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    const id = donationIdFromPath(pathname);
    if (!id || typeof window === "undefined") return;
    if (activeRef.current === id) return;
    activeRef.current = id;

    let cancelled = false;
    (async () => {
      let payload: DonateTrackingPayload | null = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        try {
          const res = await fetch(`/api/donations/${encodeURIComponent(id)}/tracking`, { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (data?.ok === true) {
            payload = data;
            break;
          }
        } catch {
          return;
        }
        if (attempt < MAX_ATTEMPTS) await sleep(RETRY_MS);
      }
      if (cancelled || !payload) return;

      const key = `marketing_final_browser:${payload.eventId}`;
      try {
        if (window.localStorage.getItem(key)) return;
      } catch {}

      try {
        const cfgRes = await fetch("/api/tracking/config", { cache: "no-store" });
        const config = (await cfgRes.json().catch(() => ({}))) as PublicTrackingConfig;
        const metaResult = fireMetaBrowserDonate(payload);
        await Promise.allSettled([
          logMetaBrowser(payload, metaResult.ok ? "SENT" : "SKIPPED", metaResult.error),
          fireGoogleAdsDonationConversion(config, payload),
          fireTikTokDonationConversion(config, payload),
          fireXDonationConversion(config, payload),
        ]);
        try { window.localStorage.setItem(key, "1"); } catch {}
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
