/**
 * Detects whether the current page is loaded inside an embedded webview /
 * in-app browser (Instagram, Facebook, TikTok, LinkedIn, etc.). Google blocks
 * OAuth from these contexts with the "This browser or app may not be secure"
 * error, so we have to redirect the user out to a real browser before calling
 * signIn("google", ...).
 */

export type InAppBrowserKind =
  | "instagram"
  | "facebook"
  | "messenger"
  | "tiktok"
  | "linkedin"
  | "snapchat"
  | "twitter"
  | "line"
  | "wechat"
  | "kakao"
  | "pinterest"
  | "reddit"
  | "android-webview"
  | "ios-webview"
  | "unknown-inapp";

export interface InAppBrowserInfo {
  isInApp: boolean;
  kind?: InAppBrowserKind;
  isAndroid: boolean;
  isIOS: boolean;
}

const NOT_IN_APP: InAppBrowserInfo = { isInApp: false, isAndroid: false, isIOS: false };

export function detectInAppBrowser(userAgent?: string): InAppBrowserInfo {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "") ??
    "";
  if (!ua) return NOT_IN_APP;

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Branded in-app browsers — these are unambiguous matches.
  // Order matters: Messenger before Facebook (Messenger UA also contains "FB").
  const branded: Array<[RegExp, InAppBrowserKind]> = [
    [/FB_IAB|FBAN|FBAV|FB4A|FBIOS/i, /Messenger|MessengerLite/i.test(ua) ? "messenger" : "facebook"],
    [/Instagram/i, "instagram"],
    [/TikTok|musical_ly|BytedanceWebview|Bytedance/i, "tiktok"],
    [/LinkedInApp/i, "linkedin"],
    [/Snapchat/i, "snapchat"],
    [/Twitter|TwitterAndroid/i, "twitter"],
    [/Line\//i, "line"],
    [/MicroMessenger|WeChat/i, "wechat"],
    [/KAKAOTALK/i, "kakao"],
    [/Pinterest/i, "pinterest"],
    [/RedditAndroid|Reddit\//i, "reddit"],
  ];

  for (const [pattern, kind] of branded) {
    if (pattern.test(ua)) {
      return { isInApp: true, kind, isAndroid, isIOS };
    }
  }

  // Generic Android WebView marker.
  if (isAndroid && /; wv\)/.test(ua)) {
    return { isInApp: true, kind: "android-webview", isAndroid, isIOS };
  }

  // Generic iOS WebView: real Safari includes "Safari/" — its absence on a
  // mobile UA usually indicates a webview wrapper.
  if (isIOS && / Mobile\//.test(ua) && !/ Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
    return { isInApp: true, kind: "ios-webview", isAndroid, isIOS };
  }

  return { isInApp: false, isAndroid, isIOS };
}

/**
 * Attempts to launch the current URL (or a given one) in the system browser
 * on Android via an `intent://` URL. Returns true if an attempt was made.
 *
 * On iOS there is no public scheme to break out of an in-app webview, so the
 * caller should fall back to instructing the user manually.
 */
export function tryOpenInExternalBrowser(targetUrl?: string): boolean {
  if (typeof window === "undefined") return false;

  const url = targetUrl ?? window.location.href;
  const info = detectInAppBrowser();

  if (info.isAndroid) {
    // Strip scheme — intent URL embeds it via S.scheme.
    const stripped = url.replace(/^https?:\/\//i, "");
    const intentUrl = `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
      url
    )};end`;
    window.location.href = intentUrl;
    return true;
  }

  return false;
}
