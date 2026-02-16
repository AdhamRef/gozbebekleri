"use client";

import { useEffect } from "react";

/**
 * Syncs <html> dir and lang to the active locale.
 * Root layout cannot read [locale], so we set document.documentElement after mount.
 */
export default function SyncHtmlDir({ locale }: { locale: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const dir = locale === "ar" ? "rtl" : "ltr";
    html.setAttribute("dir", dir);
    html.setAttribute("lang", locale === "ar" ? "ar" : locale === "fr" ? "fr" : "en");
  }, [locale]);
  return null;
}
