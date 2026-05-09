"use client";

import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import { detectInAppBrowser } from "@/lib/inAppBrowser";

interface SignInOptions {
  callbackUrl?: string;
}

/**
 * Wraps next-auth's `signIn("google", ...)` with an in-app-browser guard.
 *
 * Google blocks OAuth from embedded webviews (Instagram / Facebook / TikTok /
 * etc.) with the "This browser or app may not be secure" page. When we detect
 * one, we surface a notice instead of triggering the doomed OAuth flow.
 */
export function useGoogleSignIn() {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pendingCallbackUrl, setPendingCallbackUrl] = useState<string | undefined>(undefined);

  const signInWithGoogle = useCallback((opts: SignInOptions = {}) => {
    const info = detectInAppBrowser();
    if (info.isInApp) {
      setPendingCallbackUrl(opts.callbackUrl);
      setNoticeOpen(true);
      return;
    }
    signIn("google", { callbackUrl: opts.callbackUrl });
  }, []);

  const closeNotice = useCallback(() => setNoticeOpen(false), []);

  const continueAnyway = useCallback(() => {
    setNoticeOpen(false);
    signIn("google", { callbackUrl: pendingCallbackUrl });
  }, [pendingCallbackUrl]);

  return { signInWithGoogle, noticeOpen, closeNotice, continueAnyway };
}
