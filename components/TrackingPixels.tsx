"use client";

import React, { useEffect, useRef, createContext, useContext, useCallback, useState } from "react";

export interface TrackingConfig {
  facebookPixelId: string | null;
  gaMeasurementId: string | null;
  tiktokPixelId: string | null;
  xPixelId: string | null;
}

/** Single item for GA4 ecommerce events (item_id or item_name required) */
export interface TrackingItem {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
  item_category?: string;
}

interface TrackPurchaseOptions {
  value: number;
  currency?: string;
  orderId?: string;
  /** GA4: items array for ecommerce reports. X: used for tw_order_quantity if not provided. */
  numItems?: number;
  items?: TrackingItem[];
}

interface TrackAddToCartOptions {
  value: number;
  currency?: string;
  /** Product/campaign IDs for FB/TikTok. GA4 uses items[].item_id. */
  contentIds?: string[];
  contentName?: string;
  quantity?: number;
  /** GA4 ecommerce items (optional; built from contentIds/value if omitted) */
  items?: TrackingItem[];
}

interface TrackInitiateCheckoutOptions {
  value: number;
  currency?: string;
  numItems: number;
  contentIds?: string[];
  items?: TrackingItem[];
}

interface TrackViewContentOptions {
  contentName?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
  contentType?: string;
}

interface FacebookCAPIParams {
  event_id?: string;
  value?: number;
  currency?: string;
  url?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  contents?: { id: string; quantity?: number }[];
}

interface TrackingContextValue {
  config: TrackingConfig | null;
  trackPurchase: (options: TrackPurchaseOptions) => void;
  trackCompleteRegistration: () => void;
  trackViewContent: (params?: TrackViewContentOptions) => void;
  trackAddToCart: (options: TrackAddToCartOptions) => void;
  trackInitiateCheckout: (options: TrackInitiateCheckoutOptions) => void;
  trackPageView: (pagePath?: string, pageTitle?: string) => void;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function useTracking(): TrackingContextValue | null {
  return useContext(TrackingContext);
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: {
      load: (id: string) => void;
      page: () => void;
      track: (event: string, payload?: object) => void;
      methods?: string[];
      setAndDefer?: (o: unknown, m: string) => void;
      push: (args: unknown) => void;
    };
    twq?: (action: string, ...args: unknown[]) => void;
  }
}

function loadScript(src: string, async = true): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no document"));
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = async;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];
  const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];
  return { fbp, fbc };
}

/** Build GA4 items array from contentIds + value for a single “donation” item */
function buildGa4Items(
  contentIds: string[] | undefined,
  value: number,
  contentName?: string,
  quantity = 1
): TrackingItem[] {
  if (contentIds?.length) {
    return contentIds.map((id, i) => ({
      item_id: id,
      item_name: contentName || `Item ${id}`,
      price: contentIds.length === 1 ? value : value / contentIds.length,
      quantity,
    }));
  }
  return [{ item_id: "donation", item_name: contentName || "Donation", price: value, quantity }];
}

export default function TrackingPixels({ children }: { children: React.ReactNode }) {
  const configRef = useRef<TrackingConfig | null>(null);
  const [config, setConfig] = useState<TrackingConfig | null>(null);

  useEffect(() => {
    fetch("/api/tracking/config")
      .then((r) => r.json())
      .then((data) => {
        const c: TrackingConfig = {
          facebookPixelId: data.facebookPixelId || null,
          gaMeasurementId: data.gaMeasurementId || null,
          tiktokPixelId: data.tiktokPixelId || null,
          xPixelId: data.xPixelId || null,
        };
        configRef.current = c;
        setConfig(c);
      })
      .catch(() => setConfig(null));
  }, []);

  // Inject pixels when config is available
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
      function gtag(...args: unknown[]) {
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

  const sendFacebookCAPI = useCallback(async (eventName: string, params: FacebookCAPIParams) => {
    const { fbp, fbc } = getFbCookies();
    await fetch("/api/tracking/facebook-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        event_id: params.event_id,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
        url: params.url ?? (typeof window !== "undefined" ? window.location.href : undefined),
        value: params.value,
        currency: params.currency || "USD",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        content_ids: params.content_ids,
        content_type: params.content_type,
        num_items: params.num_items,
        contents: params.contents,
      }),
    });
  }, []);

  const trackPurchase = useCallback(
    (options: TrackPurchaseOptions) => {
      const { value, currency = "USD", orderId, numItems = 1, items: optItems } = options;
      const eventId = orderId || `purchase_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const c = configRef.current;
      const ga4Items = optItems?.length ? optItems : [{ item_id: orderId || "donation", item_name: "Donation", price: value, quantity: numItems }];

      if (c?.facebookPixelId && window.fbq) {
        window.fbq("track", "Purchase", { value, currency, content_ids: orderId ? [orderId] : undefined, content_type: "product" });
        sendFacebookCAPI("Purchase", { event_id: eventId, value, currency });
      }
      if (c?.gaMeasurementId && window.gtag) {
        window.gtag("event", "purchase", {
          currency,
          value,
          transaction_id: orderId,
          items: ga4Items,
        });
      }
      if (c?.tiktokPixelId && window.ttq) {
        window.ttq.track("CompletePayment", { value, currency, content_id: orderId });
      }
      if (c?.xPixelId && window.twq) {
        // X (Twitter) expects tw_sale_amount (number) and tw_order_quantity (integer)
        window.twq("event", c.xPixelId, { tw_sale_amount: value, tw_order_quantity: numItems });
      }
    },
    [sendFacebookCAPI]
  );

  const trackCompleteRegistration = useCallback(() => {
    const eventId = `reg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const c = configRef.current;
    if (c?.facebookPixelId && window.fbq) {
      window.fbq("track", "CompleteRegistration");
      sendFacebookCAPI("CompleteRegistration", { event_id: eventId });
    }
    if (c?.gaMeasurementId && window.gtag) {
      window.gtag("event", "sign_up", { method: "Google" });
    }
    if (c?.tiktokPixelId && window.ttq) {
      window.ttq.track("CompleteRegistration");
    }
    if (c?.xPixelId && window.twq) {
      window.twq("event", c.xPixelId);
    }
  }, [sendFacebookCAPI]);

  const trackViewContent = useCallback(
    (params?: TrackViewContentOptions) => {
      const contentIds = params?.contentIds;
      const value = params?.value;
      const currency = params?.currency ?? "USD";
      const contentName = params?.contentName;
      const contentType = params?.contentType ?? "product";
      const c = configRef.current;

      const fbParams = value != null ? { value, currency, content_type: contentType } : { content_type: contentType };
      if (contentIds?.length) Object.assign(fbParams, { content_ids: contentIds, contents: contentIds.map((id) => ({ id, quantity: 1 })) });
      if (contentName) Object.assign(fbParams, { content_name: contentName });

      if (c?.facebookPixelId && window.fbq) {
        window.fbq("track", "ViewContent", fbParams);
        if (value != null || contentIds?.length) {
          sendFacebookCAPI("ViewContent", { value, currency, content_ids: contentIds, content_type: contentType, contents: contentIds?.map((id) => ({ id, quantity: 1 })) });
        }
      }
      if (c?.gaMeasurementId && window.gtag) {
        const item = contentIds?.[0] ? { item_id: contentIds[0], item_name: contentName } : { item_id: "content", item_name: contentName || "Content" };
        window.gtag("event", "view_item", { currency: params?.currency, value: params?.value, items: [item] });
      }
      if (c?.tiktokPixelId && window.ttq) {
        window.ttq.track("ViewContent", { content_id: contentIds?.[0], content_name: contentName, value, currency, content_type: contentType });
      }
      if (c?.xPixelId && window.twq) {
        window.twq("event", c.xPixelId);
      }
    },
    [sendFacebookCAPI]
  );

  const trackAddToCart = useCallback(
    (options: TrackAddToCartOptions) => {
      const { value, currency = "USD", contentIds, contentName, quantity = 1, items: optItems } = options;
      const eventId = `atc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const c = configRef.current;
      const ga4Items = optItems?.length ? optItems : buildGa4Items(contentIds, value, contentName, quantity);
      const contents = (contentIds ?? []).map((id) => ({ id, quantity }));

      if (c?.facebookPixelId && window.fbq) {
        window.fbq("track", "AddToCart", { value, currency, content_ids: contentIds, content_type: "product", contents });
        sendFacebookCAPI("AddToCart", { event_id: eventId, value, currency, content_ids: contentIds, content_type: "product", contents });
      }
      if (c?.gaMeasurementId && window.gtag) {
        window.gtag("event", "add_to_cart", { currency, value, items: ga4Items });
      }
      if (c?.tiktokPixelId && window.ttq) {
        window.ttq.track("AddToCart", { content_id: contentIds?.[0], content_ids: contentIds, value, currency, quantity, content_type: "product" });
      }
      if (c?.xPixelId && window.twq) {
        window.twq("event", c.xPixelId, { tw_sale_amount: value, tw_order_quantity: quantity });
      }
    },
    [sendFacebookCAPI]
  );

  const trackInitiateCheckout = useCallback(
    (options: TrackInitiateCheckoutOptions) => {
      const { value, currency = "USD", numItems, contentIds, items: optItems } = options;
      const eventId = `chk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const c = configRef.current;
      const ga4Items = optItems?.length ? optItems : buildGa4Items(contentIds, value, undefined, numItems);
      const contents = (contentIds ?? []).map((id) => ({ id, quantity: 1 }));

      if (c?.facebookPixelId && window.fbq) {
        window.fbq("track", "InitiateCheckout", { value, currency, num_items: numItems, content_ids: contentIds, contents });
        sendFacebookCAPI("InitiateCheckout", { event_id: eventId, value, currency, num_items: numItems, content_ids: contentIds, contents });
      }
      if (c?.gaMeasurementId && window.gtag) {
        window.gtag("event", "begin_checkout", { currency, value, items: ga4Items });
      }
      if (c?.tiktokPixelId && window.ttq) {
        window.ttq.track("InitiateCheckout", { value, currency, content_ids: contentIds, content_type: "product" });
      }
      if (c?.xPixelId && window.twq) {
        window.twq("event", c.xPixelId, { tw_sale_amount: value, tw_order_quantity: numItems });
      }
    },
    [sendFacebookCAPI]
  );

  const trackPageView = useCallback((pagePath?: string, pageTitle?: string) => {
    const c = configRef.current;
    if (c?.facebookPixelId && window.fbq) {
      window.fbq("track", "PageView");
    }
    if (c?.gaMeasurementId && window.gtag && (pagePath || pageTitle)) {
      window.gtag("event", "page_view", { page_path: pagePath, page_title: pageTitle });
    }
    if (c?.tiktokPixelId && window.ttq) {
      window.ttq.page();
    }
    if (c?.xPixelId && window.twq) {
      window.twq("event", c.xPixelId);
    }
  }, []);

  const value: TrackingContextValue = {
    config,
    trackPurchase,
    trackCompleteRegistration,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPageView,
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
}
