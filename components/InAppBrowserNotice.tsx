"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Share2, MoreVertical, ShieldAlert } from "lucide-react";
import { detectInAppBrowser, tryOpenInExternalBrowser } from "@/lib/inAppBrowser";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Full URL to open in the system browser. Defaults to `window.location.href`. */
  targetUrl?: string;
  /** Continue OAuth anyway (e.g. user insists or detection was a false positive). */
  onContinueAnyway?: () => void;
}

export default function InAppBrowserNotice({
  isOpen,
  onClose,
  targetUrl,
  onContinueAnyway,
}: Props) {
  const t = useTranslations("InAppBrowserNotice");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState(() => detectInAppBrowser());

  useEffect(() => {
    if (isOpen) setInfo(detectInAppBrowser());
  }, [isOpen]);

  const url = useMemo(() => {
    if (targetUrl) return targetUrl;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }, [targetUrl]);

  const platformHelp = info.isIOS
    ? t("iosHelp")
    : info.isAndroid
    ? t("androidHelp")
    : t("genericHelp");

  const PlatformIcon = info.isIOS ? Share2 : MoreVertical;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked — leave the URL visible so the user can long-press.
    }
  };

  const handleOpenAndroid = () => {
    const launched = tryOpenInExternalBrowser(url);
    if (!launched) handleCopy();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        dir={isRTL ? "rtl" : "ltr"}
        className="flex w-[min(100%,calc(100vw-1.25rem))] max-w-[min(26rem,calc(100vw-1.25rem))] flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl"
        hideCloseButton
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>

        <div className="bg-[#025EB8] px-5 pt-6 pb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-base font-bold text-white">{t("title")}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-white/80">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-4 bg-white px-5 py-5">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
            <PlatformIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span className="leading-relaxed">{platformHelp}</span>
          </div>

          {url && (
            <div className="flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <span className="truncate" dir="ltr">{url}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#025EB8] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#0150a0] active:scale-[0.98]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="whitespace-nowrap">{copied ? t("copied") : t("copy")}</span>
              </button>
            </div>
          )}

          {info.isAndroid && (
            <button
              type="button"
              onClick={handleOpenAndroid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FA5D17] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#e04d0f] active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" />
              {t("openInChrome")}
            </button>
          )}

          {onContinueAnyway && (
            <button
              type="button"
              onClick={onContinueAnyway}
              className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50/80 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-800"
            >
              {t("continueAnyway")}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="block w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            {t("close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
