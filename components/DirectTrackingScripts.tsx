"use client";

import { useEffect } from "react";

type PublicTrackingConfig = {
  facebookPixelId?: string | null;
  gaMeasurementId?: string | null;
  googleAdsConversionId?: string | null;
  googleAdsConversionLabel?: string | null;
  tiktokPixelId?: string | null;
  xPixelId?: string | null;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: any;
    twq?: (...args: unknown[]) => void;
    __directTrackingLoaded?: boolean;
  }
}

function appendExternalScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function injectInlineScript(id: string, code: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "text/javascript";
  script.text = code;
  document.head.appendChild(script);
}

function loadMeta(pixelId: string) {
  if (!pixelId) return;
  if (!window.fbq) {
    const fbq = function () {
      // eslint-disable-next-line prefer-rest-params
      (fbq as any).callMethod ? (fbq as any).callMethod.apply(fbq, arguments) : (fbq as any).queue.push(arguments);
    } as any;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }
  appendExternalScript("meta-pixel-script", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function loadGoogle(gaMeasurementId?: string | null, googleAdsConversionId?: string | null) {
  const firstId = gaMeasurementId || googleAdsConversionId;
  if (!firstId) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  appendExternalScript("google-gtag-script", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(firstId)}`);
  window.gtag("js", new Date());
  if (gaMeasurementId) window.gtag("config", gaMeasurementId, { send_page_view: true });
  if (googleAdsConversionId) window.gtag("config", googleAdsConversionId);
}

function loadTikTok(pixelId: string) {
  if (!pixelId) return;
  injectInlineScript("tiktok-pixel-script", `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.load=function(e){var n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+e+"&lib="+t;(d.getElementsByTagName("script")[0]||d.head).parentNode.insertBefore(n,d.getElementsByTagName("script")[0]||d.head);ttq._i=ttq._i||{},ttq._i[e]=[],ttq._t=ttq._t||{},ttq._t[e]=+new Date};
      ttq.load("${pixelId.replace(/"/g, "\\\"")}");ttq.page();
    }(window, document, "ttq");
  `);
}

function loadX(pixelId: string) {
  if (!pixelId) return;
  injectInlineScript("x-pixel-script", `
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version="1.1",s.queue=[],u=t.createElement(n),u.async=!0,u.src="https://static.ads-twitter.com/uwt.js",a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,"script");
    twq("config","${pixelId.replace(/"/g, "\\\"")}");
  `);
}

export function DirectTrackingScripts() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__directTrackingLoaded) return;
    window.__directTrackingLoaded = true;

    fetch("/api/tracking/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((config: PublicTrackingConfig | null) => {
        if (!config) return;
        if (config.facebookPixelId) loadMeta(config.facebookPixelId);
        loadGoogle(config.gaMeasurementId, config.googleAdsConversionId);
        if (config.tiktokPixelId) loadTikTok(config.tiktokPixelId);
        if (config.xPixelId) loadX(config.xPixelId);
      })
      .catch(() => {});
  }, []);

  return null;
}
