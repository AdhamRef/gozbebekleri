"use client";

import Image from "next/image";
import { Elements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe-client";
import { StripePaymentStep, type StripePaymentHandle } from "@/components/StripePaymentStep";
import { PayForCardForm, type PayForCardState } from "@/components/PayForCardForm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  CreditCard as CardIcon,
  Check,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { getCurrency } from "@/hooks/useCampaignValue";
import { useCart } from "@/hooks/useCart";
import { useTracking } from "@/components/TrackingPixels";
import useConvetToUSD from "@/hooks/useConvetToUSD";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useRouter } from "@/i18n/routing";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useIpCountry } from "@/hooks/useIpCountry";

interface CartItem {
  id: string;
  amount: number;
  amountUSD?: number;
  shareCount?: number | null;
  campaign: {
    id: string;
    title: string;
    images: string[];
    translations?: { locale: string; title: string }[];
  };
}

interface CartPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSuccess?: () => void;
}

const CartPaymentDialog = ({ isOpen, onClose, cartItems }: CartPaymentDialogProps) => {
  const amount = cartItems.reduce((sum, item) => sum + (item.amount ?? item.amountUSD), 0);
  const t = useTranslations("DonationDialog");
  const locale = useLocale() as "ar" | "en" | "fr";
  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const btnRow = "inline-flex items-center justify-center gap-2";
  // RTL: Back → on right, Next ← on left. LTR: Back ← on left, Next → on right.
  const backLabel = isRTL ? (
    <span className={btnRow}><ChevronRight className="h-4 w-4 shrink-0" aria-hidden />{t("back")}</span>
  ) : (
    <span className={btnRow}><ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />{t("back")}</span>
  );
  const nextLabel = isRTL ? (
    <span className={btnRow}>{t("next")}<ChevronLeft className="h-4 w-4 shrink-0" aria-hidden /></span>
  ) : (
    <span className={btnRow}>{t("next")}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden /></span>
  );
  const confirmDonationLabel = isRTL ? (
    <span className={btnRow}>{t("confirmDonation")}<ChevronLeft className="h-4 w-4 shrink-0" aria-hidden /></span>
  ) : (
    <span className={btnRow}>{t("confirmDonation")}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden /></span>
  );

  const STEPS = [
    { title: t("teamSupport"),    subtitle: t("teamSupportDesc") },
    { title: t("paymentFees"),    subtitle: t("paymentFeesDesc") },
    { title: t("confirmation"),   subtitle: t("confirmationDesc") },
    { title: t("paymentInfo"),    subtitle: t("paymentInfoDesc") },
  ];

  const TEAM_SUPPORT_OPTIONS = [
    { label: t("noThanks"), value: 0 },
    { label: "5",  value: 5  },
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
  ];

  // ── state ──────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep]     = useState(0);
  const [teamSupport, setTeamSupport]     = useState(0);
  const [coverFees,   setCoverFees]       = useState(false);
  const paymentMethod = "CARD";
  // PayFor manual card inputs (use3D === true)
  const [cardDetails, setCardDetails]     = useState<PayForCardState>({ cardNumber: "", expiryDate: "", cvv: "", cardholderName: "" });
  const [cardFocus, setCardFocus]         = useState("");
  // Stripe Elements — ready state tracked here, confirmation done via ref
  const [stripeReady, setStripeReady]     = useState(false);
  const stripeFormRef = useRef<StripePaymentHandle | null>(null);
  const onStripeReadyChange = useCallback((ready: boolean) => setStripeReady(ready), []);
  // Set when PayFor fails and we get a fallback clientSecret from the server
  const [fallbackClientSecret, setFallbackClientSecret] = useState<string | null>(null);
  // Auto-select PayFor when TL currency (cart is always ONE_TIME). Fallback secret forces Stripe.
  const use3D = getCurrency() === "TRY" && !fallbackClientSecret;
  const [fallbackDonationId, setFallbackDonationId] = useState<string | null>(null);
  // Guard against duplicate fallback execution
  const hasFallenBackRef = useRef(false);
  const [loading, setLoading]             = useState(false);
  const [redirecting, setRedirecting]     = useState(false);
  const [payforSwitching, setPayforSwitching] = useState(false);
  const [mounted, setMounted]             = useState(false);
  const [phoneValue, setPhoneValue]       = useState("");
  const ipCountry = useIpCountry();
  const [currentUser, setCurrentUser]     = useState<{ phone: string | null } | null>(null);

  const payforPopupRef = useRef<Window | null>(null);
  const payforPollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session } = useSession();
  const { clearItems } = useCart();
  const router = useRouter();
  const getReferralCode = useReferralCode();
  const tracking = useTracking();
  const checkoutTrackedRef = useRef(false);
  const confetti = useConfettiStore();

  const convertToUSD = useConvetToUSD;

  // ── derived ────────────────────────────────────────────────────────────
  const fees        = (amount + teamSupport) * 0.03;
  const totalAmount = amount + teamSupport + (coverFees ? fees : 0);

  // Minimum Stripe charge = 1 USD converted to the selected currency, rounded up.
  const stripeMinAmount = (() => {
    const cur = getCurrency();
    if (cur === "USD") return 1;
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem("cachedExchangeRates") : null;
      if (!cached) return 1;
      const { rates } = JSON.parse(cached) as { rates: Record<string, number> };
      const rate = rates?.[cur];
      return rate ? Math.ceil(rate+1) : 1;
    } catch {
      return 1;
    }
  })();
  const isPhoneValid = () => phoneValue.trim().replace(/\s/g, "").length >= 10;
  const isCardValid  = () =>
    cardDetails.cardNumber.length >= 13 &&
    cardDetails.expiryDate.length  === 5  &&
    cardDetails.cvv.length         >= 3   &&
    cardDetails.cardholderName.trim().length > 0;

  // ── effects ────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !tracking || cartItems.length === 0 || checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    const ids = cartItems.map((i) => i.campaign?.id).filter(Boolean) as string[];
    tracking.trackInitiateCheckout({ value: amount, currency: getCurrency(), numItems: cartItems.length, contentIds: ids.length ? ids : undefined });
  }, [isOpen, tracking, cartItems, amount]);

  useEffect(() => {
    if (!isOpen) {
      checkoutTrackedRef.current = false;
    } else {
      // Reset fallback guard and state when dialog re-opens
      hasFallenBackRef.current = false;
      setFallbackClientSecret(null);
      setFallbackDonationId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !session?.user?.id) return;
    axios.get(`/api/users/${session.user.id}`)
      .then((res) => {
        const u = res.data?.user;
        if (u) { setCurrentUser({ phone: u.phone ?? null }); if (u.phone) setPhoneValue(u.phone); }
      })
      .catch(() => setCurrentUser(null));
  }, [isOpen, session?.user?.id]);

  // Clean up PayFor poll/popup on unmount
  useEffect(() => () => {
    if (payforPollRef.current) clearInterval(payforPollRef.current);
    if (payforPopupRef.current && !payforPopupRef.current.closed) payforPopupRef.current.close();
  }, []);

  // ── navigation ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  // ── step indicator ─────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 mb-4 px-6">
      {STEPS.map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= currentStep ? "bg-[#025EB8]" : "bg-gray-200"}`} />
      ))}
    </div>
  );

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    let isRedirecting = false;
    try {
      setLoading(true);

      // Save phone if new
      if (session?.user?.id && !currentUser?.phone && phoneValue.trim()) {
        await axios.put(`/api/users/${session.user.id}`, { phone: phoneValue.trim() });
      }

      // Build items with USD amounts
      const items = await Promise.all(
        cartItems.map(async (item) => ({
          campaignId: item.campaign.id,
          amount: item.amount,
          amountUSD: item.amountUSD != null && item.amountUSD > 0
            ? item.amountUSD
            : convertToUSD(item.amount, getCurrency()),
          ...(item.shareCount != null && item.shareCount > 0 ? { shareCount: item.shareCount } : {}),
        }))
      );

      const basePayload: Record<string, unknown> = {
        items,
        currency: getCurrency(),
        teamSupport,
        coverFees,
        type: "ONE_TIME",
        paymentMethod,
        locale,
      };
      const refCode = getReferralCode();
      if (refCode) basePayload.referralCode = refCode;

      // ── Stripe Elements direct charge (no 3D) ─────────────────────────
      // stripeFormRef.current.confirmPayment() calls stripe.confirmCardPayment()
      // with CardNumberElement inside the Elements context — card data goes
      // browser → Stripe directly, never touches our server.
      if (paymentMethod === "CARD" && !use3D) {
        if (!stripeFormRef.current) throw new Error("Stripe form not ready");

        let targetDonationId: string;
        let clientSecret: string;

        // Re-use fallback intent if PayFor previously failed
        if (fallbackClientSecret && fallbackDonationId) {
          targetDonationId = fallbackDonationId;
          clientSecret = fallbackClientSecret;
        } else {
          const res = await axios.post("/api/cart/payment", basePayload);
          if (!res.data?.success) { onClose(); return; }
          targetDonationId = res.data.donation.id as string;

          const intentRes = await axios.post("/api/stripe/charge", { donationId: targetDonationId, locale });
          if (intentRes.data.error) {
            toast.error(intentRes.data.error ?? t("donationFailed"));
            setLoading(false);
            return;
          }
          clientSecret = intentRes.data.clientSecret as string;
        }

        isRedirecting = true;
        setRedirecting(true);

        const { error: confirmError } = await stripeFormRef.current.confirmPayment(clientSecret);
        if (confirmError) {
          toast.error(confirmError.message ?? t("donationFailed"));
          setLoading(false); setRedirecting(false); isRedirecting = false;
          return;
        }

        clearItems(); confetti.onOpen();
        router.push(
          appendCurrencyQuery(`/success/${targetDonationId}`, getCurrencyCodeForLinks())
        );
        return;
      }

      // ── PayFor 3D ──────────────────────────────────────────────────────
      if (paymentMethod === "CARD" && use3D) {
        const res = await axios.post("/api/cart/payment", basePayload);
        if (!res.data?.success) { onClose(); return; }
        const donationId = res.data.donation.id as string;

        const init = await axios.post("/api/payfor/3dpay/initiate", { donationId, locale });
        const { actionUrl, fields } = init.data as { actionUrl: string; fields: Record<string, string> };

        const form = document.createElement("form");
        form.method = "POST";
        form.action = actionUrl;
        Object.entries(fields).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = name; input.value = String(value ?? "");
          form.appendChild(input);
        });

        const [mm, yy] = cardDetails.expiryDate.split("/");
        const cardFields: Record<string, string> = {
          Pan:            cardDetails.cardNumber.replace(/\s/g, ""),
          Expiry:         `${mm ?? ""}${yy ?? ""}`, // MMYY as required by Ziraat Katılım
          Cvv2:           cardDetails.cvv,
          CardHolderName: cardDetails.cardholderName,
        };
        Object.entries(cardFields).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = name; input.value = value;
          form.appendChild(input);
        });

        const pw = 600, ph = 700;
        const popup = window.open(
          "about:blank", "payfor3d",
          `width=${pw},height=${ph},left=${Math.round((screen.width  - pw) / 2)},top=${Math.round((screen.height - ph) / 2)},scrollbars=yes,resizable=yes`
        );
        form.target = popup ? "payfor3d" : "_self";
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        if (!popup) return;

        payforPopupRef.current = popup;
        isRedirecting = true;
        setRedirecting(true);

        const fallbackToStripe = async () => {
          // Guard: only run once even if poll fires multiple times
          if (hasFallenBackRef.current) return;
          hasFallenBackRef.current = true;

          if (payforPollRef.current) { clearInterval(payforPollRef.current); payforPollRef.current = null; }
          if (payforPopupRef.current && !payforPopupRef.current.closed) payforPopupRef.current.close();
          setPayforSwitching(true);
          try {
            const fbRes = await axios.post("/api/stripe/fallback", { donationId, locale });
            if (!fbRes.data.clientSecret) { toast.error(t("donationFailed")); return; }
            // Store clientSecret + donationId, switch to Stripe Elements form
            // use3D becomes false automatically via derived value once fallbackClientSecret is set
            setFallbackClientSecret(fbRes.data.clientSecret);
            setFallbackDonationId(fbRes.data.donationId ?? donationId);
            setRedirecting(false);
            setPayforSwitching(false);
            setLoading(false);
            isRedirecting = false;
          } catch {
            hasFallenBackRef.current = false; // allow retry on network error
            toast.error(t("donationFailed"));
          }
        };

        let polls = 0;
        const FALLBACK_AFTER = 25;
        payforPollRef.current = setInterval(async () => {
          polls++;
          try {
            const check = await fetch(`/api/donations/${donationId}`);
            if (!check.ok) return;
            const data = await check.json();

            if (data.status === "PAID" && data.paidAt) {
              clearInterval(payforPollRef.current!); payforPollRef.current = null;
              if (payforPopupRef.current && !payforPopupRef.current.closed) payforPopupRef.current.close();
              clearItems(); confetti.onOpen();
              router.push(
                appendCurrencyQuery(`/success/${donationId}`, getCurrencyCodeForLinks())
              );
              return;
            }
            if (data.status === "FAILED" || payforPopupRef.current?.closed || polls >= FALLBACK_AFTER) {
              await fallbackToStripe();
            }
          } catch { /* ignore transient errors */ }
        }, 2000);

        return;
      }

      // ── PayPal or other ────────────────────────────────────────────────
      const res = await axios.post("/api/cart/payment", basePayload);
      if (res.data?.success) {
        isRedirecting = true; setRedirecting(true);
        clearItems(); confetti.onOpen();
        router.push(
          appendCurrencyQuery(`/success/${res.data.donation.id}`, getCurrencyCodeForLinks())
        );
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Cart payment failed:", error);
      toast.error(t("donationFailed"));
    } finally {
      if (!isRedirecting) setLoading(false);
    }
  };

  // ── step content ───────────────────────────────────────────────────────
  const getStepContent = () => {
    if (!mounted) return null;
    const step = STEPS[currentStep];

    // Team Support
    if (step.title === t("teamSupport")) return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">{t("wantToSupportTeam")}</h3>
          <p className="text-gray-600 text-sm">{t("teamSupportHelp")}</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Input type="number" inputMode="numeric" min={0} step={1} value={teamSupport || ""} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setTeamSupport(val ? parseInt(val, 10) : 0); }} onKeyDown={(e) => { if (e.key === "." || e.key === ",") e.preventDefault(); }} placeholder={t("otherAmount")} className="text-center text-lg font-medium" />
          <div className="grid grid-cols-3 gap-3 w-full">
            {TEAM_SUPPORT_OPTIONS.map((o) => (
              <Button key={o.value} variant="outline" onClick={() => setTeamSupport(o.value)}
                className={`transition-all duration-200 ${teamSupport === o.value ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8] shadow-sm" : "hover:border-gray-400"}`}>
                <span className="font-medium" dir={o.label === t("noThanks") ? undefined : "ltr"}>{o.label === t("noThanks") ? o.label : `${o.value} ${getCurrency()}`}</span>
              </Button>
            ))}
          </div>
        </div>
        <div dir={dir} className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">{backLabel}</Button>
          <Button onClick={handleNext} className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2">{nextLabel}</Button>
        </div>
      </div>
    );

    // Payment Fees
    if (step.title === t("paymentFees")) return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">{t("coverPaymentFees")}</h3>
          <p className="text-gray-600 text-sm">{t("paymentFeesInfo")}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl space-y-3 border border-gray-200">
          <div className={`flex justify-between text-sm ${locale === "ar" ? "flex-row-reverse" : ""}`}>
            <span className="text-gray-600">{t("amount")}</span>
            <span className="font-semibold" dir="ltr">{amount} {getCurrency()}</span>
          </div>
          {teamSupport > 0 && (
            <div className={`flex justify-between text-sm ${locale === "ar" ? "flex-row-reverse" : ""}`}>
              <span className="text-gray-600">{t("teamSupport")}</span>
              <span className="font-semibold" dir="ltr">{teamSupport} {getCurrency()}</span>
            </div>
          )}
          <div className={`flex justify-between text-sm ${locale === "ar" ? "flex-row-reverse" : ""}`}>
            <span className="text-gray-600">{t("paymentFeesPercent")}</span>
            <span className="font-semibold text-[#025EB8]" dir="ltr">{fees.toFixed(2)} {getCurrency()}</span>
          </div>
        </div>
        <button type="button" onClick={() => setCoverFees(!coverFees)}
          className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 ${coverFees ? "border-[#025EB8] bg-[#025EB8]/5 shadow-sm" : "border-gray-200 hover:border-gray-400"}`}>
          <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 mt-0.5 transition-all duration-200 ${coverFees ? "bg-[#025EB8] border-[#025EB8] scale-110" : "border-gray-300"}`}>
            {coverFees && <Check className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1 text-start">
            <p className="font-semibold text-gray-900">{t("yesCoverFees")}</p>
            <p className="text-sm text-gray-500 mt-0.5">{t("feesWillBeAdded", { amount: `${fees.toFixed(2)} ${getCurrency()}` })}</p>
          </div>
        </button>
        <div dir={dir} className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">{backLabel}</Button>
          <Button onClick={handleNext} className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2">{nextLabel}</Button>
        </div>
      </div>
    );

    // Confirmation
    if (step.title === t("confirmation")) return (
      <div className="space-y-6 w-full overflow-hidden">
        <div className="text-center space-y-2 mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{t("confirmation")}</h3>
          <p className="text-gray-600 text-sm">{t("confirmationDesc")}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl space-y-4 border border-gray-200 w-full overflow-hidden">
          {cartItems.map((item) => {
            const title = item.campaign.translations?.find((tr) => tr.locale === locale)?.title ?? item.campaign.title;
            return (
              <div key={item.id} className={`flex items-center gap-2 w-full min-w-0 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
                <div className={`flex items-center gap-2 flex-1 min-w-0 overflow-hidden ${locale === "ar" ? "flex-row-reverse" : ""}`}>
                  <Image src={item.campaign.images[0]} alt={title} width={80} height={80} className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                  <div className={`min-w-0 max-w-48 ${locale === "ar" ? "text-right" : "text-left"}`}>
                    <span className="text-gray-900 font-medium text-sm block line-clamp-3" title={title}>{title}</span>
                    {item.shareCount != null && item.shareCount > 0 && (
                      <span className="text-xs text-violet-700 block mt-0.5">{t("sharesLine", { count: item.shareCount })}</span>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-gray-900 text-sm flex-shrink-0 whitespace-nowrap" dir="ltr">{item.amount} {getCurrency()}</span>
              </div>
            );
          })}
          {teamSupport > 0 && (
            <div className={`flex items-center gap-2 pt-2 w-full min-w-0 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
              <span className="text-gray-600 text-sm flex-1 min-w-0 truncate">{t("teamSupport")}</span>
              <span className="font-semibold text-gray-900 text-sm flex-shrink-0 whitespace-nowrap" dir="ltr">{teamSupport} {getCurrency()}</span>
            </div>
          )}
          {coverFees && (
            <div className={`flex items-center gap-2 w-full min-w-0 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
              <span className="text-gray-600 text-sm flex-1 min-w-0 truncate">{t("paymentFeesLabel")}</span>
              <span className="font-semibold text-gray-900 text-sm flex-shrink-0 whitespace-nowrap" dir="ltr">{fees.toFixed(2)} {getCurrency()}</span>
            </div>
          )}
          <div className="pt-3 border-t border-gray-300">
            <div className={`flex items-center gap-2 w-full min-w-0 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
              <span className="font-semibold text-gray-900 text-base flex-1 min-w-0">{t("total")}</span>
              <span className="font-bold text-[#025EB8] text-lg flex-shrink-0 whitespace-nowrap" dir="ltr">{totalAmount.toFixed(2)} {getCurrency()}</span>
            </div>
          </div>
        </div>
        <div dir={dir} className="flex gap-4 w-full">
          <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">{backLabel}</Button>
          <Button onClick={handleNext} className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2">{nextLabel}</Button>
        </div>
        <p className="text-xs text-center text-gray-500 leading-relaxed px-2 break-words">
          {t("byContinuing")}{" "}
          <a href="#" className="text-[#025EB8] hover:underline font-medium">{t("termsOfUseLink")}</a>{" "}
          {t("and")}{" "}
          <a href="#" className="text-[#025EB8] hover:underline font-medium">{t("privacyPolicyLink")}</a>
        </p>
      </div>
    );

    // Payment Info
    if (step.title === t("paymentInfo")) return (
      <div className="space-y-6 overflow-visible">
        {paymentMethod === "CARD" ? (
          <div className="text-center space-y-1">
            <p className="text-gray-900 font-semibold">{t("bankCard")}</p>
            <p className="text-sm text-gray-500">{t("secure3DCardPrompt")}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">{t("paypalRedirect")}</p>
          </div>
        )}

        {/* Stripe Elements — only mounted when use3D is false. Never mixed with PayFor. */}
        {paymentMethod === "CARD" && !use3D && (
          <Elements stripe={getStripePromise()}>
            <StripePaymentStep ref={stripeFormRef} onReadyChange={onStripeReadyChange} />
          </Elements>
        )}

        {/* PayFor manual inputs — only shown when use3D is true. No Stripe involvement. */}
        {paymentMethod === "CARD" && use3D && (
          <PayForCardForm
            cardDetails={cardDetails}
            setCardDetails={setCardDetails}
            cardFocus={cardFocus}
            setCardFocus={setCardFocus}
          />
        )}

        {/* Minimum Stripe amount warning */}
        <AnimatePresence>
          {!use3D && totalAmount < stripeMinAmount && (
            <motion.p
              key="stripe-min"
              className="text-[13px] text-amber-600 font-medium"
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {t("stripeMinDonation", { amount: stripeMinAmount, currency: getCurrency() })}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Phone */}
        <div className="space-y-2 overflow-visible pt-2 border-t border-border" dir={locale === "ar" ? "rtl" : "ltr"}>
          <label className={`block text-sm font-medium text-gray-700 ${locale === "ar" ? "text-right" : "text-left"}`}>{t("contactPhone")}</label>
          <div className="overflow-visible phone-input-wrapper">
            <PhoneInput defaultCountry={ipCountry} value={phoneValue}
              onChange={(phone) => setPhoneValue(phone)}
              className="w-full overflow-visible"
              inputClassName="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent" required />
          </div>
        </div>

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">{backLabel}</Button>
          <Button onClick={handleSubmit}
            disabled={
              loading ||
              !isPhoneValid() ||
              (paymentMethod === "CARD" && !use3D && !stripeReady) ||
              (paymentMethod === "CARD" && !use3D && totalAmount < stripeMinAmount) ||
              (paymentMethod === "CARD" && use3D && !isCardValid())
            }
            className="flex-1 bg-[#FA5D17] hover:bg-[#e04d0f] text-white inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : confirmDonationLabel}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 text-gray-400 text-[11px]">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>{t("sslSecurePayment")}</span>
        </div>
      </div>
    );

    return null;
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={() => {
      if (payforPollRef.current) clearInterval(payforPollRef.current);
      if (payforPopupRef.current && !payforPopupRef.current.closed) payforPopupRef.current.close();
      onClose();
    }}>
      <DialogContent dir={isRTL ? "rtl" : "ltr"} className="w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] max-h-screen overflow-y-auto overflow-x-hidden p-0 rounded-none sm:rounded-lg top-0 sm:top-[50%] translate-y-0 sm:translate-y-[-50%]" closeClassName="text-white hover:text-white/80" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("confirmation")}</DialogTitle>
        {mounted && (
          <>
            {/* Header */}
            <div className="relative h-24 overflow-hidden rounded-t-lg bg-[#025EB8]">
              <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">{t("oneTimeDonation")}</p>
                <h2 className="text-white font-bold text-base">{t("paymentMethod")}</h2>
              </div>
            </div>

            {renderStepIndicator()}

            <div className="relative z-10 px-6 pb-6 bg-white overflow-visible">
              <AnimatePresence mode="wait">
                <motion.div
                  key={redirecting ? "redirecting" : currentStep}
                  className="overflow-visible"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {redirecting ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
                      <div className="relative">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${payforSwitching ? "bg-[#635bff]/10" : "bg-[#025EB8]/8"}`}>
                          <CardIcon className={`h-9 w-9 transition-colors ${payforSwitching ? "text-[#635bff]" : "text-[#025EB8]"}`} />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-[#025EB8]/20 rounded-full flex items-center justify-center">
                          <ExternalLink className="h-3 w-3 text-[#025EB8]" />
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {payforSwitching ? t("paymentSwitching") : t("successRedirecting")}
                        </p>
                        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                          {payforSwitching ? t("paymentSwitchingDesc") : t("successRedirectingDesc")}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full transition-colors ${payforSwitching ? "text-[#635bff] bg-[#635bff]/8" : "text-[#025EB8] bg-[#025EB8]/6"}`}>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{payforSwitching ? t("paymentSwitching") : t("successRedirectingDesc")}</span>
                      </div>
                    </div>
                  ) : (
                    getStepContent()
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CartPaymentDialog;
