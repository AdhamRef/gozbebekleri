"use client";

import React, { useEffect, useRef, createContext, useContext, useCallback, useState } from "react";
import {
  generateEventId,
  META_EVENT_MAP,
  TIKTOK_EVENT_MAP,
  GA4_EVENT_MAP,
  type CanonicalEvent,
  type CanonicalEventName,
  type CanonicalUser,
  type CanonicalDonation,
  type CanonicalPayment,
  type CanonicalItem,
} from "@/lib/tracking/canonical";

// ─── Public config (pixel IDs only — no tokens) ───────────────────────────────
export interface TrackingConfig {
  facebookPixelId: string | null;
  gaMeasurementId: string | null;
  tiktokPixelId: string | null;
  xPixelId: string | null;
}

// ─── Legacy option types (kept for backward compat) ──────────────────────────

export interface TrackingItem {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
  item_category?: string;
}

interface TrackPurchaseOptions {
  value: number;
  valueUSD?: number;
  currency?: string;
  orderId?: string;
  numItems?: number;
  items?: TrackingItem[];
  donationType?: "ONE_TIME" | "MONTHLY";
  causeName?: string;
  causeId?: string;
  gateway?: string;
  subscriptionId?: string;
  description?: string;
}

interface TrackAddToCartOptions {
  value: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  quantity?: number;
  items?: TrackingItem[];
}

interface TrackInitiateCheckoutOptions {
  value: number;
  currency?: string;
  numItems: number;
  contentIds?: string[];
  items?: TrackingItem[];
  donationType?: "ONE_TIME" | "MONTHLY";
}

interface TrackViewContentOptions {
  contentName?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
  contentType?: string;
}

interface TrackCustomizeProductOptions {
  donationType?: "ONE_TIME" | "MONTHLY";
  amount?: number;
  currency?: string;
  causeId?: string;
  causeName?: string;
}

interface TrackAddPaymentInfoOptions {
  value: number;
  currency?: string;
  causeId?: string;
  causeName?: string;
  paymentMethod?: string;
}

interface TrackDonateOptions {
  value: number;
  currency?: string;
  causeId?: string;
  causeName?: string;
  donationType?: "ONE_TIME" | "MONTHLY";
  gateway?: string;
  is3ds?: boolean;
}

interface TrackPaymentFailedOptions {
  value?: number;
  currency?: string;
  causeId?: string;
  reason?: string;
  gateway?: string;
}

// ─── Context value ────────────────────────────────────────────────────────────

interface TrackingContextValue {
  config: TrackingConfig | null;
  setUserData: (user: Partial<CanonicalUser>) => void;
  trackDonate: (options: TrackPurchaseOptions) => void;
  trackCompleteRegistration: () => void;
  trackViewContent: (params?: TrackViewContentOptions) => void;
  trackAddToCart: (options: TrackAddToCartOptions) => void;
  trackInitiateCheckout: (options: TrackInitiateCheckoutOptions) => void;
  trackPageView: (pagePath?: string, pageTitle?: string) => void;
  trackCustomizeProduct: (options: TrackCustomizeProductOptions) => void;
  trackAddPaymentInfo: (options: TrackAddPaymentInfoOptions) => void;
  trackPaymentSubmit: (options: TrackDonateOptions) => void;
  trackPaymentFailed: (options: TrackPaymentFailedOptions) => void;
  trackMissingEvent: (customEventName: string, data?: Record<string, unknown>) => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function useTracking(): TrackingContextValue | null {
  return useContext(TrackingContext);
}

// ─── Window augmentation ──────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: {
      load: (id: string) => void;
      page: () => void;
      track: (event: string, payload?: object) => void;
      identify: (data: object) => void;
      methods?: string[];
      setAndDefer?: (o: unknown, m: string) => void;
      push: (args: unknown) => void;
    };
    twq?: (action: string, ...args: unknown[]) => void;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no document"));
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
}

function getUrlParam(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get(key) ?? undefined;
}

/** Persist ttclid / gclid / fbclid in sessionStorage so they survive page navigations */
function captureClickIds(): { ttclid?: string; gclid?: string; fbclid?: string } {
  if (typeof window === "undefined") return {};
  const ttclid = getUrlParam("ttclid") || sessionStorage.getItem("_ttclid") || undefined;
  const gclid  = getUrlParam("gclid")  || sessionStorage.getItem("_gclid")  || undefined;
  const fbclid = getUrlParam("fbclid") || undefined;
  if (ttclid) sessionStorage.setItem("_ttclid", ttclid);
  if (gclid)  sessionStorage.setItem("_gclid",  gclid);
  return { ttclid, gclid, fbclid };
}

function buildGa4Items(
  contentIds: string[] | undefined,
  value: number,
  contentName?: string,
  quantity = 1
): TrackingItem[] {
  if (contentIds?.length) {
    return contentIds.map((id) => ({
      item_id: id,
      item_name: contentName || `Item ${id}`,
      price: contentIds.length === 1 ? value : value / contentIds.length,
      quantity,
    }));
  }
  return [{ item_id: "donation", item_name: contentName || "Donation", price: value, quantity }];
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function TrackingPixels({ children }: { children: React.ReactNode }) {
  const configRef = useRef<TrackingConfig | null>(null);
  const [config, setConfig] = useState<TrackingConfig | null>(null);
  // Mutable user data — updated by DonationDialog when user fills in details
  const userDataRef = useRef<Partial<CanonicalUser>>({});

  // ── Load pixel config ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tracking/config")
      .then((r) => r.json())
      .then((data) => {
        const c: TrackingConfig = {
          facebookPixelId: data.facebookPixelId || null,
          gaMeasurementId: data.gaMeasurementId || null,
          tiktokPixelId:   data.tiktokPixelId   || null,
          xPixelId:        data.xPixelId        || null,
        };
        configRef.current = c;
        setConfig(c);
      })
      .catch(() => setConfig(null));
  }, []);

  // ── Inject pixel scripts once config is ready ────────────────────────────────
  useEffect(() => {
    if (!config) return;

    // Facebook Pixel (Meta)
    if (config.facebookPixelId) {
      const id = config.facebookPixelId;
      (function (_f: unknown, b: Window, e: string, v: string) {
        if (b.fbq) return;
        interface FbqFn {
          (): void;
          callMethod?: (...a: unknown[]) => void;
          queue: unknown[];
          push: unknown;
          loaded: boolean;
          version: string;
        }
        const n: FbqFn = function () {
          n.callMethod ? n.callMethod(...arguments) : n.queue.push(arguments);
        } as FbqFn;
        b.fbq = n;
        if (!(b as Window & { _fbq?: FbqFn })._fbq) (b as Window & { _fbq?: FbqFn })._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        const t = document.createElement(e) as HTMLScriptElement;
        t.async = true;
        t.src = v;
        const s = document.getElementsByTagName(e)[0];
        s?.parentNode?.insertBefore(t, s);
      })(undefined, window, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq?.("init", id);
      window.fbq?.("track", "PageView");
    }

    // Google Analytics 4
    if (config.gaMeasurementId) {
      const id = config.gaMeasurementId;
      window.dataLayer = window.dataLayer || [];
      function gtag(..._args: unknown[]) {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      }
      (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = gtag;
      gtag("js", new Date());
      gtag("config", id, { send_page_view: true });
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${id}`).catch(() => {});
    }

    // TikTok Pixel
    if (config.tiktokPixelId) {
      const id = config.tiktokPixelId;
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.innerHTML = `
        !function(w,d,t){
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
          ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.load=function(e){var n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+e+"&lib="+t;(d.getElementsByTagName("script")[0]||d.head).parentNode.insertBefore(n,d.getElementsByTagName("script")[0]||d.head);ttq._i=ttq._i||{},ttq._i[e]=[],ttq._t=ttq._t||{},ttq._t[e]=+new Date};
          ttq.load("${id.replace(/"/g, '\\"')}");ttq.page();
        }(window,document,"ttq");
      `;
      document.head.appendChild(script);
    }

    // X (Twitter) Pixel
    if (config.xPixelId) {
      const id = config.xPixelId;
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.innerHTML = `
        !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version="1.1",s.queue=[],u=t.createElement(n),u.async=!0,u.src="https://static.ads-twitter.com/uwt.js",a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,"script");
        twq("config","${id.replace(/"/g, '\\"')}");
      `;
      document.head.appendChild(script);
    }
  }, [config]);

  // ── Scroll depth tracking (25 / 50 / 75 / 100 %) ─────────────────────────────
  useEffect(() => {
    const fired = new Set<number>();
    const thresholds = [25, 50, 75, 100];

    const handler = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total    = document.documentElement.scrollHeight;
      const pct      = Math.floor((scrolled / total) * 100);
      for (const t of thresholds) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          sendCanonical({
            event:   "scroll_depth",
            event_id: generateEventId("scroll"),
            custom:  { percent: t },
          });
        }
      }
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User engagement (time on page) ────────────────────────────────────────────
  useEffect(() => {
    const start = Date.now();
    let sent10 = false;
    let sent30 = false;

    const interval = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      if (sec >= 10 && !sent10) {
        sent10 = true;
        sendCanonical({
          event:    "user_engagement",
          event_id: generateEventId("eng"),
          custom:   { engagement_time_msec: 10_000, milestone: "10s" },
        });
      }
      if (sec >= 30 && !sent30) {
        sent30 = true;
        clearInterval(interval);
        sendCanonical({
          event:    "user_engagement",
          event_id: generateEventId("eng"),
          custom:   { engagement_time_msec: 30_000, milestone: "30s" },
        });
      }
    }, 5_000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core canonical sender ─────────────────────────────────────────────────────

  /**
   * Build a full CanonicalEvent from partial input, fire browser pixels,
   * then POST to /api/track for server-side CAPI + TikTok Events API.
   */
  const sendCanonical = useCallback(
    (partial: Omit<CanonicalEvent, "event_time"> & { event_time?: number }) => {
      const ids = captureClickIds();
      const event: CanonicalEvent = {
        event_time: Math.floor(Date.now() / 1000),
        ...partial,
        page: {
          url:      typeof window !== "undefined" ? window.location.href  : undefined,
          referrer: typeof document !== "undefined" ? document.referrer   : undefined,
          title:    typeof document !== "undefined" ? document.title      : undefined,
          language: typeof navigator !== "undefined" ? navigator.language : undefined,
          ...partial.page,
        },
        session: {
          ttclid: ids.ttclid,
          gclid:  ids.gclid,
          fbclid: ids.fbclid,
          ...partial.session,
        },
        user: {
          fbp:        getCookieValue("_fbp"),
          fbc:        getCookieValue("_fbc") || (ids.fbclid ? `fb.1.${Date.now()}.${ids.fbclid}` : undefined),
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          ...userDataRef.current,
          ...partial.user,
        },
      };

      const c = configRef.current;

      // ── Meta Pixel (browser) ──────────────────────────────────────────────
      const metaEventName = META_EVENT_MAP[event.event];
      if (c?.facebookPixelId && window.fbq && metaEventName) {
        const d = event.donation ?? {};
        const p = event.payment  ?? {};
        const fbData: Record<string, unknown> = {};
        // Core value
        if (d.amount_usd ?? d.amount) fbData.value    = d.amount_usd ?? d.amount;
        if (d.currency)               fbData.currency = d.currency;
        // Content IDs / Contents
        if (event.items?.length) {
          fbData.content_ids = event.items.map((i) => i.item_id);
          fbData.contents    = event.items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, item_price: i.price ?? 0 }));
          fbData.num_items   = event.items.reduce((s: number, i) => s + (i.quantity ?? 1), 0);
        } else if (d.cause_id) {
          fbData.content_ids = [d.cause_id];
          fbData.contents    = [{ id: d.cause_id, quantity: 1, item_price: d.amount_usd ?? d.amount ?? 0 }];
          fbData.num_items   = 1;
        }
        // Content metadata
        fbData.content_type = "product";
        if (d.content_name ?? d.cause_name)        fbData.content_name          = d.content_name ?? d.cause_name;
        if (d.content_category ?? d.donation_type) fbData.content_category      = d.content_category ?? d.donation_type?.toLowerCase();
        if (d.delivery_category)                    fbData.delivery_category     = d.delivery_category;
        if (d.description)                          fbData.description           = d.description;
        if (d.status)                               fbData.status                = d.status;
        if (d.payment_info_available != null)       fbData.payment_info_available = d.payment_info_available;
        if (d.predicted_ltv != null)                fbData.predicted_ltv         = d.predicted_ltv;
        if (p.transaction_id)                       fbData.order_id              = p.transaction_id;
        window.fbq("track", metaEventName, fbData, { eventID: event.event_id });
      }

      // ── TikTok Pixel (browser) ────────────────────────────────────────────
      const tiktokEventName = TIKTOK_EVENT_MAP[event.event];
      if (c?.tiktokPixelId && window.ttq && tiktokEventName) {
        const d = event.donation ?? {};
        window.ttq.track(tiktokEventName, {
          value:        d.amount_usd ?? d.amount,
          currency:     d.currency,
          content_id:   event.items?.[0]?.item_id ?? d.cause_id,
          content_name: d.cause_name,
          content_type: "product",
          event_id:     event.event_id,  // TikTok dedup key
        });
      }

      // ── GA4 ───────────────────────────────────────────────────────────────
      const ga4EventName = GA4_EVENT_MAP[event.event];
      if (c?.gaMeasurementId && window.gtag && ga4EventName) {
        const d  = event.donation ?? {};
        const p  = event.payment  ?? {};
        const ga4: Record<string, unknown> = {};
        if (d.amount_usd ?? d.amount) ga4.value    = d.amount_usd ?? d.amount;
        if (d.currency)               ga4.currency  = d.currency;
        if (p.transaction_id)         ga4.transaction_id = p.transaction_id;
        if (event.items?.length) {
          ga4.items = event.items.map((i) => ({
            item_id:       i.item_id,
            item_name:     i.item_name,
            item_category: i.item_category,
            price:         i.price,
            quantity:      i.quantity ?? 1,
          }));
        }
        if (event.custom) Object.assign(ga4, event.custom);
        window.gtag("event", ga4EventName, ga4);
      }

      // ── X (Twitter) ───────────────────────────────────────────────────────
      if (c?.xPixelId && window.twq) {
        const d = event.donation ?? {};
        window.twq("event", c.xPixelId, {
          tw_sale_amount:    d.amount_usd ?? d.amount,
          tw_order_quantity: event.items?.reduce((s, i) => s + (i.quantity ?? 1), 0) ?? 1,
        });
      }

      // ── Server (CAPI + TikTok Events API) ────────────────────────────────
      // Fire-and-forget — don't block UI
      fetch("/api/track", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(event),
        keepalive: true,
      }).catch(() => {});
    },
    []
  );

  // ── Public API ────────────────────────────────────────────────────────────────

  const setUserData = useCallback((user: Partial<CanonicalUser>) => {
    userDataRef.current = { ...userDataRef.current, ...user };
    // Also identify in TikTok Pixel
    if (configRef.current?.tiktokPixelId && window.ttq?.identify) {
      const u = userDataRef.current;
      window.ttq.identify({
        external_id: u.external_id,
        email:       u.email,
        phone_number: u.phone,
      });
    }
  }, []);

  const trackPageView = useCallback((pagePath?: string, pageTitle?: string) => {
    sendCanonical({
      event:    "page_view",
      event_id: generateEventId("pv"),
      page:     { url: pagePath, title: pageTitle },
    });
  }, [sendCanonical]);

  const trackViewContent = useCallback((params?: TrackViewContentOptions) => {
    sendCanonical({
      event:    "view_content",
      event_id: generateEventId("vc"),
      donation: {
        cause_id:   params?.contentIds?.[0],
        cause_name: params?.contentName,
        amount:     params?.value,
        currency:   params?.currency,
      },
      items: params?.contentIds?.map((id) => ({
        item_id:   id,
        item_name: params.contentName,
        price:     params.value,
        quantity:  1,
      })),
    });
  }, [sendCanonical]);

  const trackAddToCart = useCallback((options: TrackAddToCartOptions) => {
    const { value, currency = "USD", contentIds, contentName, quantity = 1, items } = options;
    sendCanonical({
      event:    "add_to_cart",
      event_id: generateEventId("atc"),
      donation: { amount: value, currency, cause_id: contentIds?.[0], cause_name: contentName },
      items:    items?.length
        ? items.map((i) => ({ ...i }))
        : buildGa4Items(contentIds, value, contentName, quantity).map((i) => ({ ...i })),
    });
  }, [sendCanonical]);

  const trackCustomizeProduct = useCallback((options: TrackCustomizeProductOptions) => {
    sendCanonical({
      event:    "customize_product",
      event_id: generateEventId("cp"),
      donation: {
        donation_type: options.donationType,
        amount:        options.amount,
        currency:      options.currency,
        cause_id:      options.causeId,
        cause_name:    options.causeName,
      },
      custom: { donation_type: options.donationType, amount: options.amount },
    });
  }, [sendCanonical]);

  const trackInitiateCheckout = useCallback((options: TrackInitiateCheckoutOptions) => {
    const { value, currency = "USD", numItems, contentIds, items, donationType } = options;
    sendCanonical({
      event:    "begin_checkout",
      event_id: generateEventId("chk"),
      donation: {
        amount:        value,
        currency,
        donation_type: donationType,
        cause_id:      contentIds?.[0],
      },
      items: items?.length
        ? items.map((i) => ({ ...i }))
        : buildGa4Items(contentIds, value, undefined, numItems).map((i) => ({ ...i })),
    });
  }, [sendCanonical]);

  const trackAddPaymentInfo = useCallback((options: TrackAddPaymentInfoOptions) => {
    sendCanonical({
      event:    "add_payment_info",
      event_id: generateEventId("api"),
      donation: {
        amount:     options.value,
        currency:   options.currency,
        cause_id:   options.causeId,
        cause_name: options.causeName,
      },
      payment: { method: options.paymentMethod },
      items: [{
        item_id:   options.causeId ?? "donation",
        item_name: options.causeName ?? "Donation",
        price:     options.value,
        quantity:  1,
      }],
    });
  }, [sendCanonical]);

  const trackPaymentSubmit = useCallback((options: TrackDonateOptions) => {
    sendCanonical({
      event:    "payment_submit",
      event_id: generateEventId("don"),
      donation: {
        amount:        options.value,
        currency:      options.currency,
        cause_id:      options.causeId,
        cause_name:    options.causeName,
        donation_type: options.donationType,
        recurring:     options.donationType === "MONTHLY",
      },
      payment: {
        gateway: options.gateway as CanonicalPayment["gateway"],
        is_3ds:  options.is3ds,
        payment_status: "pending",
      },
    });
  }, [sendCanonical]);

  const trackPaymentFailed = useCallback((options: TrackPaymentFailedOptions) => {
    sendCanonical({
      event:    "payment_failed",
      event_id: generateEventId("fail"),
      donation: {
        amount:   options.value,
        currency: options.currency,
        cause_id: options.causeId,
      },
      payment: {
        gateway:        options.gateway as CanonicalPayment["gateway"],
        payment_status: "failed",
        failure_reason: options.reason,
      },
    });
  }, [sendCanonical]);

  const trackDonate = useCallback((options: TrackPurchaseOptions) => {
    const { value, valueUSD, currency = "USD", orderId, numItems = 1, items, donationType, causeName, causeId, gateway, subscriptionId, description } = options;
    const canonItems: CanonicalItem[] = items?.length
      ? items.map((i) => ({ ...i }))
      : [{ item_id: causeId ?? orderId ?? "donation", item_name: causeName ?? "Donation", price: value, quantity: numItems, item_category: "donation" }];

    sendCanonical({
      event:    "donation_complete",
      event_id: generateEventId("pur"),
      // subscription_id is a user_data field in Meta — merge it for this event only
      user: subscriptionId ? { subscription_id: subscriptionId } : undefined,
      donation: {
        amount:                 value,
        amount_usd:             valueUSD ?? value,
        currency,
        cause_id:               causeId,
        cause_name:             causeName,
        content_name:           causeName,
        content_category:       donationType ? donationType.toLowerCase() : "donation",
        description,
        status:                 "completed",
        payment_info_available: 1,
        donation_type:          donationType,
        recurring:              donationType === "MONTHLY",
      },
      payment: {
        transaction_id: orderId,
        payment_status: "success",
        gateway:        gateway as CanonicalPayment["gateway"],
      },
      items: canonItems,
    });
  }, [sendCanonical]);

  const trackCompleteRegistration = useCallback(() => {
    sendCanonical({
      event:    "sign_up",
      event_id: generateEventId("reg"),
    });
  }, [sendCanonical]);

  const trackMissingEvent = useCallback((customEventName: string, data?: Record<string, unknown>) => {
    sendCanonical({
      event:    "_missing_event",
      event_id: generateEventId("mis"),
      custom:   { custom_event_name: customEventName, ...data },
    });
    // Also fire as a custom GA4 event
    if (configRef.current?.gaMeasurementId && window.gtag) {
      window.gtag("event", customEventName, data ?? {});
    }
  }, [sendCanonical]);

  const value: TrackingContextValue = {
    config,
    setUserData,
    trackDonate,
    trackCompleteRegistration,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPageView,
    trackCustomizeProduct,
    trackAddPaymentInfo,
    trackPaymentSubmit,
    trackPaymentFailed,
    trackMissingEvent,
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
}
