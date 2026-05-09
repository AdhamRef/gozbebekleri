/**
 * Safe analytics dispatcher used by the engagement instrumentation layer.
 *
 * Every function here is null-safe: if Clarity / GA4 / GTM are blocked,
 * unloaded, or never initialised, calls are no-ops. Nothing in here ever
 * throws to the caller.
 *
 * Adds NO UI — only forwards events to whichever analytics globals exist.
 *
 * Targets, in order:
 *   1. Microsoft Clarity (`window.clarity`) — for session-recording filters.
 *   2. Google Analytics 4 (`window.gtag`) — for funnel reports.
 *   3. GTM dataLayer (`window.dataLayer`) — picked up by anything wired into GTM.
 */

type AnyRecord = Record<string, unknown>;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
    // gtag, dataLayer already declared elsewhere (TrackingPixels.tsx)
  }
}

/** Tag the current Clarity session with key=value (filterable, smart segments). */
export function clarityTag(key: string, value: string | string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.clarity?.("set", key, value);
  } catch {
    /* noop */
  }
}

/** Fire a custom Clarity event (filterable, alerts, smart segments). */
export function clarityEvent(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.clarity?.("event", name);
  } catch {
    /* noop */
  }
}

/** Identify a known user in Clarity (logged-in donors, admins). */
export function clarityIdentify(
  userId: string,
  sessionId?: string,
  pageId?: string,
  friendlyName?: string
): void {
  if (typeof window === "undefined") return;
  try {
    window.clarity?.("identify", userId, sessionId, pageId, friendlyName);
  } catch {
    /* noop */
  }
}

/**
 * Single dispatch entry point used by `EngagementInstrumentation`. Fans out to
 * Clarity (as event + tag), GA4, and the GTM dataLayer. Safe to call even when
 * all three are absent.
 */
export function trackEngagement(name: string, data?: AnyRecord): void {
  if (typeof window === "undefined") return;

  // Clarity — emit the event for filtering, and copy any string params as tags.
  clarityEvent(name);
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        clarityTag(k, String(v));
      }
    }
  }

  // GA4 — passthrough, doesn't throw if gtag is undefined.
  try {
    window.gtag?.("event", name, data ?? {});
  } catch {
    /* noop */
  }

  // GTM dataLayer — anything bound to dataLayer in the user's GTM container
  // (e.g. Ads conversion tags) gets these too.
  try {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...(data ?? {}) });
    }
  } catch {
    /* noop */
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, data ?? {});
  }
}
