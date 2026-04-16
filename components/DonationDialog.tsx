import { Elements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe-client";
import { StripePaymentStep, type StripePaymentHandle } from "@/components/StripePaymentStep";
import { PayForCardForm, type PayForCardState } from "@/components/PayForCardForm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
// useCallback is used for stable onReadyChange callback passed to StripePaymentStep
import {
  Calendar,
  Heart,
  CreditCard as CardIcon,
  ShoppingCart,
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
import {
  DEFAULT_SUGGESTED_DONATION_AMOUNTS,
  parseSuggestedDonations,
  resolveSuggestedAmountsForCurrency,
  type SuggestedDonationsConfig,
} from "@/lib/campaign/suggested-donations";
import {
  FUNDRAISING_SHARES,
  GOAL_TYPE_OPEN,
  parseSuggestedShareCounts,
} from "@/lib/campaign/campaign-modes";
import useConvetToUSD from "@/hooks/useConvetToUSD";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useCurrency } from "@/context/CurrencyContext";
import { formatNumber } from "@/hooks/formatNumber";
import { useCart } from "@/hooks/useCart";
import { useTracking } from "@/components/TrackingPixels";
import { useRouter } from "@/i18n/routing";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useIpCountry } from "@/hooks/useIpCountry";

type DonationType = "ONE_TIME" | "MONTHLY";
type PaymentMethod = "CARD" | "PAYPAL" | null;

interface DonationStep {
  title: string;
  subtitle: string;
}

interface DonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignTitle?: string;
  campaignImage?: string;
  targetAmount?: number;
  amountRaised?: number;
  /** When true, skip one-time/monthly choice and use monthly only */
  monthlyOnly?: boolean;
  /** Category donation: donate to a category instead of a campaign */
  categoryId?: string;
  categoryName?: string;
  categoryImage?: string;
  /** Pre-fill amount (e.g. from QuickDonate) */
  initialDonationAmount?: number;
  /** Campaign quick-pick amounts; per-currency overrides resolved with current cookie currency */
  suggestedDonations?: SuggestedDonationsConfig | null;
  goalType?: string;
  fundraisingMode?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[] } | null;
}


const DonationDialog = ({
  isOpen,
  onClose,
  campaignTitle = "",
  campaignId = "",
  campaignImage = "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg",
  targetAmount = 0,
  amountRaised = 0,
  monthlyOnly = false,
  categoryId = "",
  categoryName = "",
  categoryImage,
  initialDonationAmount,
  suggestedDonations,
  goalType = "FIXED",
  fundraisingMode = "AMOUNT",
  sharePriceUSD,
  suggestedShareCounts,
}: DonationDialogProps) => {
  const isCategoryMode = Boolean(categoryId);
  const openGoal = goalType === GOAL_TYPE_OPEN;
  const shareMode =
    !isCategoryMode &&
    Boolean(campaignId) &&
    fundraisingMode === FUNDRAISING_SHARES &&
    sharePriceUSD != null &&
    sharePriceUSD > 0;
  const sharePickCounts = useMemo(
    () => parseSuggestedShareCounts(suggestedShareCounts).counts,
    [suggestedShareCounts]
  );
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
  const getReferralCode = useReferralCode();

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || "";
  };

  const TEAM_SUPPORT_OPTIONS = [
    { label: t("noThanks"), value: 0 },
    { label: "5", value: 5 },
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
  ];

  const DONATION_STEPS: Record<DonationType, DonationStep[]> = {
    ONE_TIME: [
      { title: t("donationAmount"), subtitle: t("donationAmountDesc") },
      { title: t("teamSupport"), subtitle: t("teamSupportDesc") },
      { title: t("paymentFees"), subtitle: t("paymentFeesDesc") },
      { title: t("confirmation"), subtitle: t("confirmationDesc") },
      { title: t("paymentInfo"), subtitle: t("paymentInfoDesc") },
    ],
    MONTHLY: [
      {
        title: t("monthlyDonationAmount"),
        subtitle: t("monthlyDonationAmountDesc"),
      },
      { title: t("billingDay"), subtitle: t("billingDayDesc") },
      { title: t("teamSupport"), subtitle: t("teamSupportDesc") },
      { title: t("paymentFees"), subtitle: t("paymentFeesDesc") },
      { title: t("confirmation"), subtitle: t("confirmationDesc") },
      { title: t("paymentInfo"), subtitle: t("paymentInfoDesc") },
    ],
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [donationType, setDonationType] = useState<DonationType | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [teamSupport, setTeamSupport] = useState<number>(0);
  const [coverFees, setCoverFees] = useState(false);
  const [billingDay, setBillingDay] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  // PayFor manual card inputs (use3D === true)
  const [cardDetails, setCardDetails] = useState<PayForCardState>({ cardNumber: "", expiryDate: "", cvv: "", cardholderName: "" });
  const [cardFocus, setCardFocus] = useState("");
  // Stripe Elements — ready state tracked here, confirmation done via ref
  const [stripeReady, setStripeReady] = useState(false);
  const stripeFormRef = useRef<StripePaymentHandle | null>(null);
  // Stable callback — prevents useEffect loop inside StripePaymentStep
  const onStripeReadyChange = useCallback((ready: boolean) => setStripeReady(ready), []);
  // Auto-select PayFor when ONE_TIME + TL, Stripe otherwise. Fallback secret forces Stripe.
  const [fallbackClientSecret, setFallbackClientSecret] = useState<string | null>(null);
  // use3D is derived: PayFor when one-time TL donation (no manual override)
  const use3D = donationType === "ONE_TIME" && getCurrency() === "TRY" && !fallbackClientSecret;
  const [fallbackDonationId, setFallbackDonationId] = useState<string | null>(null);
  // Guard against duplicate fallback execution
  const hasFallenBackRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [payforSwitching, setPayforSwitching] = useState(false);
  const payforPopupRef = useRef<Window | null>(null);
  const payforPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const ipCountry = useIpCountry();
  const [currentUser, setCurrentUser] = useState<{
    phone: string | null;
    country: string | null;
    countryCode?: string | null;
    countryName?: string | null;
    city?: string | null;
    region?: string | null;
  } | null>(null);
  const { data: session } = useSession();
  const { convertToCurrency, exchangeRates } = useCurrency();
  const [shareCount, setShareCount] = useState(1);
  const { addItem, setItems } = useCart();
  const tracking = useTracking();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !session?.user?.id) return;
    axios
      .get(`/api/users/${session.user.id}`)
      .then((res) => {
        const user = res.data?.user;
        if (user) {
          setCurrentUser({
            phone: user.phone ?? null,
            country: user.country ?? null,
            countryCode: user.countryCode ?? null,
            countryName: user.countryName ?? null,
            city: user.city ?? null,
            region: user.region ?? null,
          });
          if (user.phone) setPhoneValue(user.phone);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [isOpen, session?.user?.id]);

  // Reset state when dialog opens + fire view_donation_page
  useEffect(() => {
    if (isOpen) {
      setFallbackClientSecret(null);
      setFallbackDonationId(null);
      hasFallenBackRef.current = false;
      // Track opening the donation flow
      tracking?.trackViewContent({
        contentIds:  campaignId ? [campaignId] : categoryId ? [categoryId] : undefined,
        contentName: campaignTitle || categoryName || undefined,
        value:       initialDonationAmount || undefined,
        currency:    getCurrency(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When monthlyOnly (e.g. QuickDonate category), pre-select monthly and skip type step
  useEffect(() => {
    if (isOpen && monthlyOnly && !donationType) {
      setDonationType("MONTHLY");
      setCurrentStep(0);
    }
  }, [isOpen, monthlyOnly, donationType]);

  useEffect(() => {
    if (isOpen && shareMode) {
      setDonationType("ONE_TIME");
      setCurrentStep(0);
      setShareCount(1);
    }
  }, [isOpen, shareMode]);

  useEffect(() => {
    if (!isOpen || !shareMode || sharePriceUSD == null || sharePriceUSD <= 0) return;
    const r = convertToCurrency(sharePriceUSD);
    const unit =
      r?.convertedValue != null && Number.isFinite(r.convertedValue)
        ? r.convertedValue
        : sharePriceUSD;
    setDonationAmount(Math.round(shareCount * unit * 100) / 100);
  }, [isOpen, shareMode, shareCount, sharePriceUSD, exchangeRates, convertToCurrency]);

  // Pre-fill amount and skip amount step when opening with initialDonationAmount (e.g. from QuickDonate)
  useEffect(() => {
    if (isOpen && initialDonationAmount != null && initialDonationAmount > 0) {
      setDonationAmount(initialDonationAmount);
      setCurrentStep(1); // skip first step (donation amount)
    }
  }, [isOpen, initialDonationAmount]);

  const confetti = useConfettiStore();

  const presetDonationAmounts = useMemo(() => {
    if (!campaignId || isCategoryMode) {
      return DEFAULT_SUGGESTED_DONATION_AMOUNTS;
    }
    const cfg = parseSuggestedDonations(suggestedDonations);
    return resolveSuggestedAmountsForCurrency(cfg, getCurrency());
  }, [campaignId, isCategoryMode, suggestedDonations, isOpen]);

  const progress =
    openGoal ||
    !targetAmount ||
    convertToCurrency(targetAmount).convertedValue == null ||
    convertToCurrency(targetAmount).convertedValue === 0
      ? 0
      : Math.min(
          100,
          ((amountRaised + donationAmount) /
            (convertToCurrency(targetAmount).convertedValue as number)) *
            100
        );
  const fees = (donationAmount + teamSupport) * 0.03;
  const totalAmount = donationAmount + teamSupport + (coverFees ? fees : 0);

  const handleTypeSelect = (type: DonationType) => {
    setDonationType(type);
    setPaymentMethod("CARD");
    setCardDetails({ cardNumber: "", expiryDate: "", cvv: "", cardholderName: "" });
    setCurrentStep(0);
    tracking?.trackCustomizeProduct({
      donationType: type,
      causeId:   campaignId || categoryId || undefined,
      causeName: campaignTitle || categoryName || undefined,
    });
  };

  const isPhoneValid = () => {
    const p = phoneValue.trim().replace(/\s/g, "");
    return p.length >= 10;
  };

  // Alias: useConvetToUSD is a plain utility (not a React hook) — alias to avoid rules-of-hooks lint errors
  const convertToUSD = useConvetToUSD;

  const handleNext = () => {
    const steps = getSteps();
    const nextStep = currentStep + 1;

    if (currentStep < steps.length - 1) {
      setCurrentStep(nextStep);

      // ── Funnel events on step transitions ──────────────────────────────────
      const currency = getCurrency();
      const nextTitle = steps[nextStep]?.title;

      // Reached confirmation step → InitiateCheckout
      if (nextTitle === t("confirmation")) {
        tracking?.trackInitiateCheckout({
          value:       donationAmount,
          currency,
          numItems:    1,
          contentIds:  campaignId ? [campaignId] : categoryId ? [categoryId] : undefined,
          donationType: donationType ?? undefined,
        });
      }

      // Reached payment step → AddPaymentInfo
      if (nextTitle === t("paymentInfo")) {
        tracking?.trackAddPaymentInfo({
          value:         donationAmount,
          currency,
          causeId:       campaignId || categoryId || undefined,
          causeName:     campaignTitle || categoryName || undefined,
          paymentMethod: paymentMethod ?? "CARD",
        });
      }

      // Amount step → CustomizeProduct with amount
      if (steps[currentStep]?.title === t("donationAmount") || steps[currentStep]?.title === t("monthlyDonationAmount")) {
        tracking?.trackCustomizeProduct({
          donationType: donationType ?? undefined,
          amount:       donationAmount,
          currency,
          causeId:      campaignId || categoryId || undefined,
          causeName:    campaignTitle || categoryName || undefined,
        });
      }
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /** Donation Value step: return to type choice, previous step, or close dialog. */
  const handleBackFromDonationValueStep = () => {
    if (!monthlyOnly && !shareMode && donationType) {
      setDonationType(null);
      setCurrentStep(0);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }
    onClose();
  };

  const getSteps = () => {
    return donationType ? DONATION_STEPS[donationType] : [];
  };

  const renderStepIndicator = () => {
    const steps = getSteps();
    return (
      <div className="flex items-center gap-1 mb-4 px-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              index <= currentStep ? "bg-[#025EB8]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStepContent = () => {
    if (!mounted) return null;

    if (!donationType && !monthlyOnly && !shareMode) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("chooseDonationType")}
            </h2>
            <p className="text-gray-600">
              {t("chooseDonationTypeDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleTypeSelect("ONE_TIME")}
              variant="outline"
              className="h-auto p-6 hover:border-[#025EB8] hover:bg-[#025EB8]/5 group transition-all duration-200"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#025EB8]/10 flex items-center justify-center group-hover:bg-[#025EB8]/20 transition-colors">
                  <Heart className="w-6 h-6 text-[#025EB8]" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("oneTimeDonation")}</h3>
                <p className="text-sm text-gray-500 whitespace-normal break-words">{t("oneTimeDonationDesc")}</p>
              </div>
            </Button>

            <Button
              onClick={() => handleTypeSelect("MONTHLY")}
              variant="outline"
              className="h-auto p-6 hover:border-[#025EB8] hover:bg-[#025EB8]/5 group transition-all duration-200"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#025EB8]/10 flex items-center justify-center group-hover:bg-[#025EB8]/20 transition-colors">
                  <Calendar className="w-6 h-6 text-[#025EB8]" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("monthlyDonation")}</h3>
                <p className="text-sm text-gray-500 whitespace-normal break-words">{t("monthlyDonationDesc")}</p>
              </div>
            </Button>
          </div>
        </div>
      );
    }

    const steps = getSteps();
    
    // Safety check: ensure steps array is populated and currentStep is valid
    if (!steps.length || !steps[currentStep]) {
      return null;
    }

    switch (steps[currentStep].title) {
      case t("donationAmount"):
      case t("monthlyDonationAmount"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("donationValue")}
              </h3>
              <p className="text-gray-600 text-sm flex flex-col items-center gap-1">
                {t("hadithQuote")}
                <span className="text-[#025EB8] text-base">
                  {t("hadithText")}
                </span>
              </p>
            </div>
            {donationType === "ONE_TIME" && campaignId && !openGoal && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("collected")}{" "}
                    <span dir="ltr">{formatNumber((convertToCurrency(Math.round(amountRaised)).convertedValue ?? 0) + donationAmount)} {getCurrency()}</span>
                  </span>
                  <span className="text-gray-600">
                    {t("goal")}{" "}
                    <span dir="ltr">{formatNumber(convertToCurrency(Math.round(targetAmount)).convertedValue ?? 0)} {getCurrency()}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#025EB8] h-2 rounded-full max-w-full transition-all duration-500 ease-in-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              {shareMode && sharePriceUSD != null ? (
                <>
                  <p className="text-sm text-center text-gray-600">
                    {t("sharePriceLabel")}{" "}
                    <span dir="ltr">{formatNumber(convertToCurrency(sharePriceUSD).convertedValue ?? sharePriceUSD)} {getCurrency()}</span>
                  </p>
                  <p className="text-xs text-center text-gray-500">{t("sharesPickHint")}</p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShareCount((c) => Math.max(1, c - 1))}
                    >
                      −
                    </Button>
                    <div className="min-w-[5rem] text-center">
                      <span className="text-2xl font-bold text-gray-900">{shareCount}</span>
                      <p className="text-xs text-gray-500">{t("sharesLabel")}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShareCount((c) => c + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {sharePickCounts.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant="outline"
                        onClick={() => setShareCount(c)}
                        className={
                          shareCount === c
                            ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]"
                            : ""
                        }
                      >
                        {c*sharePriceUSD > 0 ? (
                          <span dir="ltr">{formatNumber(convertToCurrency(c * sharePriceUSD).convertedValue ?? c * sharePriceUSD)} {getCurrency()}</span>
                        ) : (
                          t("free")
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="text-center text-base font-semibold text-[#025EB8]">
                    {t("donationTotal")}: <span dir="ltr">{formatNumber(donationAmount)} {getCurrency()}</span>
                  </p>
                </>
              ) : (
                <>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={donationAmount || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setDonationAmount(val ? parseInt(val, 10) : 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "." || e.key === ",") e.preventDefault();
                    }}
                    placeholder={t("enterDonationAmount")}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    {presetDonationAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => setDonationAmount(amount)}
                        className={`${
                          donationAmount === amount
                            ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]"
                            : ""
                        }`}
                      >
                        <span dir="ltr">{amount} {getCurrency()}</span>
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between gap-4 mt-6 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackFromDonationValueStep}
                className="flex-1 min-w-[6rem] inline-flex items-center justify-center gap-2"
              >
                {backLabel}
              </Button>
              {!isCategoryMode && campaignId && donationType !== "MONTHLY" && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const amountUSD =
                        shareMode && sharePriceUSD != null
                          ? shareCount * sharePriceUSD
                          : useConvetToUSD(donationAmount, getCurrency());
                      const response = await axios.post("/api/cart", {
                        campaignId: campaignId,
                        amount: donationAmount,
                        amountUSD,
                        currency: getCurrency(),
                        ...(shareMode ? { shareCount } : {}),
                      });
                      addItem(response.data || []);
                      tracking?.trackAddToCart({
                        value: donationAmount,
                        currency: getCurrency(),
                        contentIds: [campaignId],
                        contentName: campaignTitle,
                        quantity: 1,
                      });
                      window.location.reload();
                    } catch (error) {
                      console.error("Error adding to cart:", error);
                      toast.error(t("failedToAddToCart"));
                    } finally {
                      onClose();
                    }
                  }}
                  className="flex-1 min-w-[6rem] flex justify-center items-center gap-2 bg-[#025EB8]/10 text-[#025EB8] hover:bg-[#025EB8]/20 !border-none !shadow-none"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t("addToCart")}
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!donationAmount}
                className="flex-1 min-w-[6rem] bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2"
              >
                {nextLabel}
              </Button>
            </div>
          </div>
        );

      case t("teamSupport"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("wantToSupportTeam")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("teamSupportHelp")}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={teamSupport || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setTeamSupport(val ? parseInt(val, 10) : 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === ",") e.preventDefault();
                }}
                placeholder={t("otherAmount")}
              />
              <div className="grid grid-cols-3 gap-3 w-full">
                {TEAM_SUPPORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    onClick={() => setTeamSupport(option.value)}
                    className={`${
                      teamSupport === option.value
                        ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]"
                        : ""
                    }`}
                  >
                    <span className="font-medium" dir={option.label === t("noThanks") ? undefined : "ltr"}>{option.label === t("noThanks") ? option.label : `${option.value} ${getCurrency()}`}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">
                {backLabel}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2"
              >
                {nextLabel}
              </Button>
            </div>
          </div>
        );

      case t("paymentFees"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("coverPaymentFees")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("paymentFeesInfo")}
              </p>
            </div>

            <div dir={locale === "ar" ? "rtl" : "ltr"} className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("amount")}</span>
                <span className="font-medium" dir="ltr">{formatNumber(donationAmount)} {getCurrency()}</span>
              </div>
              {teamSupport > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("teamSupport")}</span>
                  <span className="font-medium" dir="ltr">{formatNumber(teamSupport)} {getCurrency()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("paymentFeesPercent")}</span>
                <span className="font-medium" dir="ltr">{fees.toFixed(2)} {getCurrency()}</span>
              </div>
            </div>

            <button
              type="button"
              dir={locale === "ar" ? "rtl" : "ltr"}
              onClick={() => setCoverFees(!coverFees)}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 ${
                coverFees
                  ? "border-[#025EB8] bg-[#025EB8]/5"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 mt-0.5 transition-all duration-200 ${
                coverFees ? "bg-[#025EB8] border-[#025EB8]" : "border-gray-300"
              }`}>
                {coverFees && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 text-start">
                <p className="font-medium text-gray-900">{t("yesCoverFees")}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t("feesWillBeAdded", { amount: `${fees.toFixed(2)} ${getCurrency()}` })}
                </p>
              </div>
            </button>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">
                {backLabel}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2"
              >
                {nextLabel}
              </Button>
            </div>
          </div>
        );

      case t("confirmation"):
        return (
          <div className="space-y-8">
            {/* Campaign or Category Image Section */}
            {(campaignImage || categoryImage || isCategoryMode) && (
              <div className="relative h-48 rounded-lg overflow-hidden">
                <img
                  src={isCategoryMode ? (categoryImage || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg") : campaignImage}
                  alt={isCategoryMode ? categoryName : campaignTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <h2 className="text-white text-2xl font-bold">
                    {isCategoryMode ? categoryName : campaignTitle}
                  </h2>
                </div>
              </div>
            )}

            {/* Donation Details Section */}
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t("donationType")}</span>
                <span className="font-medium text-gray-900">
                  {donationType === "ONE_TIME" ? t("oneTime") : t("monthly")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t("amount")}</span>
                <span className="font-medium text-gray-900" dir="ltr">{formatNumber(donationAmount)} {getCurrency()}</span>
              </div>
              {teamSupport > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t("teamSupport")}</span>
                  <span className="font-medium text-gray-900" dir="ltr">{formatNumber(teamSupport)} {getCurrency()}</span>
                </div>
              )}
              {coverFees && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t("paymentFeesLabel")}</span>
                  <span className="font-medium text-gray-900" dir="ltr">{fees.toFixed(2)} {getCurrency()}</span>
                </div>
              )}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{t("total")}</span>
                  <span className="font-bold text-[#025EB8] text-xl" dir="ltr">{totalAmount.toFixed(2)} {getCurrency()}</span>
                </div>
              </div>
            </div>

            {/* Buttons Section */}
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
              >
                {backLabel}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 py-3 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2"
              >
                {nextLabel}
              </Button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-center text-gray-500 mt-4">
              {t("byContinuing")}{" "}
              <a href="#" className="text-[#025EB8] hover:underline">
                {t("termsOfUseLink")}
              </a>{" "}
              {t("and")}{" "}
              <a href="#" className="text-[#025EB8] hover:underline">
                {t("privacyPolicyLink")}
              </a>
            </p>
          </div>
        );

      case t("billingDay"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("chooseBillingDay")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("billingDayInfo")}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <Button
                  key={day}
                  variant="outline"
                  onClick={() => setBillingDay(day)}
                  className={`${
                    billingDay === day
                      ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8]"
                      : ""
                  }`}
                >
                  {day}
                </Button>
              ))}
            </div>

            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 inline-flex items-center justify-center gap-2"
              >
                {backLabel}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white inline-flex items-center justify-center gap-2"
              >
                {nextLabel}
              </Button>
            </div>
          </div>
        );
      case t("paymentInfo"):
        return (
          <div className="space-y-6 overflow-visible">
            {paymentMethod === "CARD" ? (
              <div className="text-center space-y-3">
                <p className="text-gray-900 font-semibold">{t("bankCard")}</p>
                <p className="text-sm text-gray-600">
                  {t("secure3DCardPrompt")}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600">
                  {t("paypalRedirect")}
                </p>
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

            <div className="space-y-2 overflow-visible pt-2 border-t border-border" dir={locale === "ar" ? "rtl" : "ltr"}>
              <label className={`block text-sm font-medium text-gray-700 ${locale === "ar" ? "text-right" : "text-left"}`}>{t("contactPhone")}</label>
              <div className="overflow-visible phone-input-wrapper">
                <PhoneInput
                  defaultCountry={ipCountry}
                  value={phoneValue}
                  onChange={(phone) => setPhoneValue(phone)}
                  className="w-full overflow-visible"
                  inputClassName="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div dir={dir} className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1 inline-flex items-center justify-center gap-2">
                {backLabel}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !isPhoneValid() ||
                  (paymentMethod === "CARD" && !use3D && !stripeReady) ||
                  (paymentMethod === "CARD" && use3D && (
                    cardDetails.cardNumber.length < 13 ||
                    cardDetails.expiryDate.length < 5 ||
                    cardDetails.cvv.length < 3 ||
                    !cardDetails.cardholderName.trim()
                  ))
                }
                className="flex-1 bg-[#FA5D17] hover:bg-[#e04d0f] text-white inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  confirmDonationLabel
                )}
              </Button>

            </div>
            <div className="flex items-center justify-center gap-2 pt-2 text-gray-400 text-[11px]">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span>{t("sslSecurePayment")}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    let isRedirecting = false;
    try {
      setLoading(true);
      if (session?.user?.id && !currentUser?.phone && phoneValue.trim()) {
        await axios.put(`/api/users/${session.user.id}`, {
          phone: phoneValue.trim(),
        });
      }
      const amountUSD =
        shareMode && sharePriceUSD != null
          ? shareCount * sharePriceUSD
          : convertToUSD(donationAmount, getCurrency());

      // Push user data for enhanced matching
      tracking?.setUserData({
        external_id: session?.user?.id ?? undefined,
        email:       (session?.user as { email?: string })?.email ?? undefined,
        phone:       phoneValue.trim() || undefined,
        country_code: currentUser?.countryCode ?? undefined,
        city:         currentUser?.city ?? undefined,
        state:        currentUser?.region ?? undefined,
      });

      // payment_submit event
      tracking?.trackPaymentSubmit({
        value:        totalAmount,
        currency:     getCurrency(),
        causeId:      campaignId || categoryId || undefined,
        causeName:    campaignTitle || categoryName || undefined,
        donationType: donationType ?? undefined,
        gateway:      use3D ? "payfor" : "stripe",
        is3ds:        use3D,
      });
      const donationData: Record<string, unknown> = {
        currency: getCurrency(),
        teamSupport,
        coverFees,
        type: donationType,
        paymentMethod,
        cardDetails: null,
        billingDay: donationType === "MONTHLY" ? billingDay : null,
        locale,
      };
      const refCode = getReferralCode();
      if (refCode) donationData.referralCode = refCode;
      if (isCategoryMode && categoryId) {
        donationData.categoryItems = [
          { categoryId, amount: donationAmount, amountUSD },
        ];
      } else if (campaignId) {
        donationData.items = [
          {
            campaignId,
            amount: donationAmount,
            amountUSD,
            ...(shareMode ? { shareCount } : {}),
          },
        ];
      }

      // ── Stripe Elements direct-charge path (non-3D card / monthly) ───────
      // stripeFormRef.current.confirmPayment() calls stripe.confirmCardPayment()
      // with the CardNumberElement — card data goes browser → Stripe, never our server.
      if (paymentMethod === "CARD" && !use3D) {
        if (!stripeFormRef.current) throw new Error("Stripe form not ready");

        let targetDonationId: string;
        let clientSecret: string;

        // Re-use fallback intent if PayFor previously failed
        if (fallbackClientSecret && fallbackDonationId) {
          targetDonationId = fallbackDonationId;
          clientSecret = fallbackClientSecret;
        } else {
          const response = await axios.post("/api/donations", donationData);
          if (!response.data.success) { onClose(); return; }
          targetDonationId = response.data.donation.id as string;

          const endpoint = donationType === "MONTHLY" ? "/api/stripe/subscribe" : "/api/stripe/charge";
          const intentRes = await axios.post(endpoint, { donationId: targetDonationId, locale });
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
          setLoading(false);
          setRedirecting(false);
          isRedirecting = false;
          return;
        }

        router.push(
          appendCurrencyQuery(`/success/${targetDonationId}`, getCurrencyCodeForLinks())
        );
        return;
      }

      // ── PayFor 3D path ────────────────────────────────────────────────────
      const response = await axios.post("/api/donations", donationData);

      if (response.data.success) {
        const donationId = response.data.donation.id as string;

        if (paymentMethod === "CARD" && use3D) {
            const init = await axios.post("/api/payfor/3dpay/initiate", { donationId, locale });
            const { actionUrl, fields } = init.data as {
              actionUrl: string;
              fields: Record<string, string>;
            };

            const form = document.createElement("form");
            form.method = "POST";
            form.action = actionUrl;
            Object.entries(fields).forEach(([name, value]) => {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              input.value = String(value ?? "");
              form.appendChild(input);
            });

            const [mm, yy] = cardDetails.expiryDate.split("/");
            const cardFields: Record<string, string> = {
              Pan: cardDetails.cardNumber.replace(/\s/g, ""),
              Expiry: `${mm ?? ""}${yy ?? ""}`, // MMYY as required by Ziraat Katılım
              Cvv2: cardDetails.cvv,
              CardHolderName: cardDetails.cardholderName,
            };
            Object.entries(cardFields).forEach(([name, value]) => {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              input.value = value;
              form.appendChild(input);
            });

            const pw = 600, ph = 700;
            const pl = Math.round((screen.width - pw) / 2);
            const pt = Math.round((screen.height - ph) / 2);
            const popup = window.open(
              "about:blank",
              "payfor3d",
              `width=${pw},height=${ph},left=${pl},top=${pt},scrollbars=yes,resizable=yes`
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
              // Guard: only run once even if poll fires multiple times simultaneously
              if (hasFallenBackRef.current) return;
              hasFallenBackRef.current = true;

              if (payforPollRef.current) {
                clearInterval(payforPollRef.current);
                payforPollRef.current = null;
              }
              if (payforPopupRef.current && !payforPopupRef.current.closed) {
                payforPopupRef.current.close();
              }
              setPayforSwitching(true);
              try {
                const fbRes = await axios.post("/api/stripe/fallback", { donationId, locale });
                if (!fbRes.data.clientSecret) { toast.error(t("donationFailed")); return; }
                // Store clientSecret + donationId; use3D becomes false automatically via derived value
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
            const FALLBACK_AFTER_POLLS = 25;

            payforPollRef.current = setInterval(async () => {
              polls++;
              try {
                const res = await fetch(`/api/donations/${donationId}`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.status === "PAID") {
                  clearInterval(payforPollRef.current!);
                  payforPollRef.current = null;
                  if (payforPopupRef.current && !payforPopupRef.current.closed) {
                    payforPopupRef.current.close();
                  }
                  router.push(
                    appendCurrencyQuery(`/success/${donationId}`, getCurrencyCodeForLinks())
                  );
                  return;
                }
                if (data.status === "FAILED" || payforPopupRef.current?.closed || polls >= FALLBACK_AFTER_POLLS) {
                  await fallbackToStripe();
                }
              } catch {
                // Ignore transient errors
              }
            }, 2000);

            return;
        }

        isRedirecting = true;
        setRedirecting(true);
        router.push(
          appendCurrencyQuery(`/success/${donationId}`, getCurrencyCodeForLinks())
        );
        return;
      }
      onClose();
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error(t("donationFailed"));
      tracking?.trackPaymentFailed({
        value:   donationAmount,
        currency: getCurrency(),
        causeId: campaignId || categoryId || undefined,
        reason:  error instanceof Error ? error.message : "unknown",
        gateway: use3D ? "payfor" : "stripe",
      });
    } finally {
      if (!isRedirecting) setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      // Clean up PayFor polling if dialog is closed mid-flow
      if (payforPollRef.current) {
        clearInterval(payforPollRef.current);
        payforPollRef.current = null;
      }
      if (payforPopupRef.current && !payforPopupRef.current.closed) {
        payforPopupRef.current.close();
      }
      onClose();
    }}>
      <DialogContent dir={isRTL ? "rtl" : "ltr"} className="w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] max-h-screen overflow-y-auto overflow-x-hidden p-0 rounded-none sm:rounded-lg top-0 sm:top-[50%] translate-y-0 sm:translate-y-[-50%]" closeClassName="text-white hover:text-white/80" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("donationAmount")}</DialogTitle>
        {mounted && (
          <>
            {/* Branded header */}
            <div className="relative h-28 overflow-hidden rounded-t-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isCategoryMode ? (categoryImage || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg") : (campaignImage || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg")}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#025EB8]/80" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  {donationType === "MONTHLY" ? t("monthlyDonation") : t("oneTimeDonation")}
                </p>
                <h2 className="text-white font-bold text-base line-clamp-2 leading-snug">
                  {isCategoryMode ? categoryName : campaignTitle}
                </h2>
              </div>
            </div>
            {/* Step progress bar */}
            {donationType && renderStepIndicator()}
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
                          {payforSwitching
                            ? t("paymentSwitchingDesc")
                            : t("successRedirectingDesc")}
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

export default DonationDialog;