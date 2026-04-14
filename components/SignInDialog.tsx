"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { signIn } from "next-auth/react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Heart,
  Shield,
  Users,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useIpCountry } from "@/hooks/useIpCountry";

// ── Module-level component — stable identity, no focus-loss on re-render ────
interface AuthFieldProps {
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
  isRTL: boolean;
}

function AuthField({
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  rightSlot,
  isRTL,
}: AuthFieldProps) {
  return (
    <div className="relative">
      <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? "right-3" : "left-3"}`}>
        <Icon className="w-4 h-4" />
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir={type === "email" || type === "password" ? "ltr" : isRTL ? "rtl" : "ltr"}
        className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm outline-none focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/10 transition-all bg-white text-gray-800 placeholder-gray-400
          ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"}
          ${rightSlot ? (isRTL ? "pl-10" : "pr-10") : ""}`}
      />
      {rightSlot && (
        <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-3" : "right-3"}`}>
          {rightSlot}
        </span>
      )}
    </div>
  );
}

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

type Screen = "options" | "auth" | "otp";
type AuthMode = "signin" | "signup";

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
}

export default function SignInDialog({ isOpen, onClose, callbackUrl }: SignInDialogProps) {
  const t = useTranslations("SignInDialog");
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  // ── Screen state ──────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("options");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    firstName: "", lastName: "", phone: "", email: "", password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Inbox-check state ─────────────────────────────────────────────────────
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setScreen("options");
      setAuthMode("signin");
      setForm({ firstName: "", lastName: "", phone: "", email: "", password: "" });
      setError(null);
      setResendSuccess(false);
      setShowPassword(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [isOpen]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  const startCountdown = useCallback((seconds = 60) => {
    setResendCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((s) => {
        if (s <= 1) { clearInterval(countdownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  // ── Google sign-in ────────────────────────────────────────────────────────
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: callbackUrl ?? pathname });
  };

  // ── Email sign-in ─────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!form.email.trim() || !form.password) {
      setError(t("fillAllFields")); return;
    }
    setLoading(true); setError(null);
    try {
      const res = await signIn("credentials", {
        email: form.email.toLowerCase().trim(),
        password: form.password,
        redirect: false,
      });
      if (res?.ok) {
        onClose();
      } else if (res?.error === "EMAIL_NOT_VERIFIED") {
        // Resend verification link and go to inbox screen
        await sendVerificationLink(form.email.toLowerCase().trim());
        setPendingEmail(form.email.toLowerCase().trim());
        setScreen("otp");
        startCountdown();
      } else {
        setError(t("invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
      setError(t("fillAllFields")); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t("invalidEmail")); return;
    }
    if (form.password.length < 8) {
      setError(t("passwordTooShort")); return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingEmail(form.email.toLowerCase().trim());
        setScreen("otp");
        startCountdown();
      } else {
        if (data.error === "EMAIL_EXISTS") setError(t("emailAlreadyExists"));
        else if (data.error === "PASSWORD_TOO_SHORT") setError(t("passwordTooShort"));
        else setError(t("serverError"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Verification link helpers ─────────────────────────────────────────────
  const sendVerificationLink = async (email: string) => {
    await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "VERIFY_EMAIL", locale }),
    });
  };

  const handleResendLink = async () => {
    if (resendCountdown > 0) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, purpose: "VERIFY_EMAIL", locale }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendSuccess(true);
        startCountdown();
        setTimeout(() => setResendSuccess(false), 3000);
      } else if (data.error === "RATE_LIMITED") {
        startCountdown(data.waitSeconds);
      } else {
        setError(t("serverError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const ipCountry = useIpCountry();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        dir={dir}
        className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
      >
        <DialogClose
          className="absolute top-3.5 end-3.5 z-50 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </DialogClose>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-[#025EB8] px-6 pt-7 pb-6 text-center relative">
          {screen !== "options" && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (screen === "otp") setScreen("auth");
                else setScreen("options");
              }}
              className={`absolute top-4 ${isRTL ? "right-4" : "left-4"} w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors`}
            >
              <ArrowLeft className={`w-4 h-4 text-white ${isRTL ? "rotate-180" : ""}`} />
            </button>
          )}

          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i.ibb.co/ZwcJcN1/logo.webp"
              alt="Logo"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </div>

          <DialogTitle className="text-lg font-bold text-white">
            {screen === "otp"
              ? t("verifyEmail")
              : screen === "auth" && authMode === "signup"
              ? t("createAccount")
              : t("welcomeTitle")}
          </DialogTitle>
          <p className="mt-1 text-xs text-white/70 leading-relaxed">
            {screen === "otp"
              ? t("checkYourEmail")
              : t("welcomeSubtitle")}
          </p>

          {screen === "options" && (
            <div className="flex items-center justify-center gap-4 mt-3">
              {([{ icon: Shield, key: "secure" }, { icon: Heart, key: "trusted" }, { icon: Users, key: "community" }] as const).map(
                ({ icon: Icon, key }) => (
                  <div key={key} className="flex items-center gap-1 text-white/60 text-[11px]">
                    <Icon className="w-3 h-3 text-white" />
                    <span>{t(key)}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="bg-white px-6 pt-5 pb-5 space-y-4">

          {/* ── OPTIONS screen ─────────────────────────────────────────── */}
          {screen === "options" && (
            <>
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/google.svg" alt="Google" className="w-5 h-5 flex-shrink-0" />
                {t("signInWithGoogle")}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400 font-medium">{t("orContinueWith")}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Email option */}
              <button
                type="button"
                onClick={() => { setScreen("auth"); setError(null); }}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#025EB8] hover:bg-[#0150a0] text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98]"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                {t("signInWithEmail")}
              </button>

              {/* Terms */}
              <p className="text-[11px] text-center text-gray-400 leading-relaxed">
                {t("termsAgreement")}{" "}
                <Link href="/terms" className="text-[#025EB8] hover:underline font-medium">{t("termsOfUse")}</Link>
                {" "}{t("and")}{" "}
                <Link href="/privacy" className="text-[#025EB8] hover:underline font-medium">{t("privacyPolicy")}</Link>
              </p>
            </>
          )}

          {/* ── AUTH screen ────────────────────────────────────────────── */}
          {screen === "auth" && (
            <>
              {/* Tab switcher */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {(["signin", "signup"] as AuthMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setAuthMode(mode); setError(null); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      authMode === mode
                        ? "bg-white text-[#025EB8] shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {mode === "signin" ? t("signIn") : t("signUp")}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Sign-up extra fields */}
              {authMode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <AuthField
                    isRTL={isRTL}
                    icon={User}
                    value={form.firstName}
                    onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                    placeholder={t("firstNamePlaceholder")}
                    autoComplete="given-name"
                  />
                  <AuthField
                    isRTL={isRTL}
                    icon={User}
                    value={form.lastName}
                    onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                    placeholder={t("lastNamePlaceholder")}
                    autoComplete="family-name"
                  />
                </div>
              )}

              {authMode === "signup" && (
                <div className="phone-input-wrapper overflow-visible">
                  <PhoneInput
                    defaultCountry={ipCountry}
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    className="w-full overflow-visible"
                    inputClassName="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/10 transition-all"
                  />
                </div>
              )}

              <AuthField
                isRTL={isRTL}
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
              />

              <AuthField
                isRTL={isRTL}
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                placeholder={t("passwordPlaceholder")}
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Submit */}
              <button
                type="button"
                onClick={authMode === "signin" ? handleSignIn : handleRegister}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#025EB8] hover:bg-[#0150a0] disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : authMode === "signin"
                  ? t("signIn")
                  : t("createAccount")}
              </button>

              {/* Terms */}
              <p className="text-[11px] text-center text-gray-400 leading-relaxed">
                {t("termsAgreement")}{" "}
                <Link href="/terms" className="text-[#025EB8] hover:underline font-medium">{t("termsOfUse")}</Link>
                {" "}{t("and")}{" "}
                <Link href="/privacy" className="text-[#025EB8] hover:underline font-medium">{t("privacyPolicy")}</Link>
              </p>
            </>
          )}

          {/* ── Inbox screen ───────────────────────────────────────────── */}
          {screen === "otp" && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-[#025EB8]/8 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-[#025EB8]" />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-800">{t("checkInbox")}</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t("verificationLinkSent")}{" "}
                  <span className="font-medium text-gray-700 break-all">{pendingEmail}</span>
                </p>
                <p className="text-xs text-gray-400">{t("checkSpam")}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Resend success flash */}
              {resendSuccess && (
                <div className="w-full bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-sm text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {t("resendLinkSent")}
                </div>
              )}

              {/* Resend */}
              <div className="w-full pt-1">
                {resendCountdown > 0 ? (
                  <p className="text-xs text-gray-400">
                    {t("resendIn").replace("{seconds}", String(resendCountdown))}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendLink}
                    disabled={loading}
                    className="text-xs text-[#025EB8] hover:underline font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RefreshCw className="w-3 h-3" />}
                    {t("resendCode")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
