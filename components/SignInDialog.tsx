'use client';

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { signIn } from 'next-auth/react';
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { X, Heart, Shield, Users } from "lucide-react";

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

export default function SignInDialog({ isOpen, onClose, callbackUrl }: SignInDialogProps) {
  const t = useTranslations("SignInDialog");
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const handleSignIn = (provider: string) => {
    const url = callbackUrl ?? pathname;
    signIn(provider, { callbackUrl: url });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        dir={isRTL ? "rtl" : "ltr"}
        className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
      >
        {/* ── Explicit close button — always on top ── */}
        <DialogClose
          className="absolute top-3.5 end-3.5 z-50 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </DialogClose>

        {/* ── Header — brand blue ── */}
        <div className="bg-[#025EB8] px-6 pt-8 pb-7 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i.ibb.co/ZwcJcN1/logo.webp"
              alt="Logo"
              className="h-14 w-auto object-contain brightness-0 invert"
            />
          </div>

          <DialogTitle className="text-xl font-bold text-white">
            {t("welcomeTitle")}
          </DialogTitle>
          <p className="mt-1.5 text-sm text-white/70 leading-relaxed">
            {t("welcomeSubtitle")}
          </p>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {[
              { icon: Shield, key: "secure" },
              { icon: Heart, key: "trusted" },
              { icon: Users, key: "community" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-1 text-white/60 text-[11px]">
                <Icon className="w-3 h-3 text-white" />
                <span>{t(key as "secure" | "trusted" | "community")}</span>
              </div>
            ))}
          </div>
        </div>
            
        {/* ── Body — white ── */}
        <div className="bg-white px-6 pt-2 pb-4 space-y-3">

          {/* Google */}
          <button
            type="button"
            onClick={() => handleSignIn('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/google.svg" alt="Google" className="w-5 h-5 flex-shrink-0" />
            {t("signInWithGoogle")}
          </button>

          {/* Facebook */}
          {/* <button
            type="button"
            onClick={() => handleSignIn('facebook')}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#1877F2] hover:bg-[#1568d3] text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <img src="/facebook.svg" alt="Facebook" className="w-5 h-5 flex-shrink-0" />
            {t("signInWithFacebook")}
          </button> */}

          {/* Divider */}
          {/* <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 font-medium">{t("orContinueWith") || "or"}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div> */}

          {/* Orange donate CTA hint */}
          {/* <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#FA5D17]/8 border border-[#FA5D17]/15">
            <Heart className="w-4 h-4 text-[#FA5D17] flex-shrink-0" fill="currentColor" />
            <p className="text-xs text-gray-600 leading-snug">
              {t("donationHint") || "Sign in to track your donations and manage your account."}
            </p>
          </div> */}

          {/* Terms */}
          <p className="text-[11px] text-center text-gray-400 leading-relaxed pt-1">
            {t("termsAgreement")}{" "}
            <Link href="/terms" className="text-[#025EB8] hover:underline font-medium">
              {t("termsOfUse")}
            </Link>
            {" "}{t("and")}{" "}
            <Link href="/privacy" className="text-[#025EB8] hover:underline font-medium">
              {t("privacyPolicy")}
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
