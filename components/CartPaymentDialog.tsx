import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  CreditCard as CardIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import axios from "axios";
import Cards from "react-credit-cards-2";
import "react-credit-cards-2/dist/es/styles-compiled.css";
import { toast } from "react-hot-toast";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { getCurrency } from "@/hooks/useCampaignValue";
import { useCart } from "@/hooks/useCart";
import { useTracking } from "@/components/TrackingPixels";
import useConvetToUSD from "@/hooks/useConvetToUSD";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

type DonationType = "ONE_TIME" | "MONTHLY";
type PaymentMethod = "CARD" | "PAYPAL" | null;

interface DonationStep {
  title: string;
  subtitle: string;
}
interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

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
  amount: number;
}

const CartPaymentDialog = ({ isOpen, onClose, cartItems, amount }: CartPaymentDialogProps) => {
  const t = useTranslations("DonationDialog");
  const locale = useLocale() as "ar" | "en" | "fr";
  const isRTL = locale === "ar";

  const CART_STEPS: DonationStep[] = [
    { title: t("teamSupport"), subtitle: t("teamSupportDesc") },
    { title: t("paymentFees"), subtitle: t("paymentFeesDesc") },
    { title: t("confirmation"), subtitle: t("confirmationDesc") },
    { title: t("paymentMethod"), subtitle: t("paymentMethodDesc") },
    { title: t("paymentInfo"), subtitle: t("paymentInfoDesc") },
  ];

  const DONATION_STEPS: Record<DonationType, DonationStep[]> = {
    ONE_TIME: CART_STEPS,
    MONTHLY: CART_STEPS,
  };

  const TEAM_SUPPORT_OPTIONS = [
    { label: t("noThanks"), value: 0 },
    { label: "5", value: 5 },
    { label: "10", value: 10 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
  ];

  const PAYMENT_METHODS = [
    { id: "CARD", name: t("bankCard"), icon: CardIcon, description: t("cardDescription") },
    { id: "PAYPAL", name: "PayPal", icon: CardIcon, description: t("paypalDescription") },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [donationType, setDonationType] = useState<DonationType | null>(
    "ONE_TIME"
  );
  const [teamSupport, setTeamSupport] = useState<number>(0);
  const [coverFees, setCoverFees] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [mounted, setMounted] = useState(false);
  const [focus, setFocus] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{ phone: string | null; country: string | null } | null>(null);
  const { data: session } = useSession();

  const { clearItems } = useCart();
  const router = useRouter();
  const getReferralCode = useReferralCode();
  const tracking = useTracking();
  const checkoutTrackedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fire InitiateCheckout when user opens cart payment dialog (checkout started)
  useEffect(() => {
    if (!isOpen || !tracking || cartItems.length === 0 || checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    const contentIds = cartItems.map((i) => i.campaign?.id).filter(Boolean) as string[];
    tracking.trackInitiateCheckout({
      value: amount,
      currency: "USD",
      numItems: cartItems.length,
      contentIds: contentIds.length ? contentIds : undefined,
    });
  }, [isOpen, tracking, cartItems, amount]);

  useEffect(() => {
    if (!isOpen) checkoutTrackedRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !session?.user?.id) return;
    axios
      .get(`/api/users/${session.user.id}`)
      .then((res) => {
        const user = res.data?.user;
        if (user) {
          setCurrentUser({ phone: user.phone ?? null, country: user.country ?? null });
          if (user.phone) setPhoneValue(user.phone);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [isOpen, session?.user?.id]);

  const isPhoneValid = () => {
    const p = phoneValue.trim().replace(/\s/g, "");
    return p.length >= 10;
  };

  const confetti = useConfettiStore();

  const fees = (amount + teamSupport) * 0.03;
  const totalAmount = amount + teamSupport + (coverFees ? fees : 0);

  const handleTypeSelect = (type: DonationType) => {
    setDonationType(type);
    setCurrentStep(0);
  };

  const handleNext = () => {
    const steps = getSteps();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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

  const isCardDetailsValid = () => {
    return (
      cardDetails.cardNumber.length === 16 &&
      cardDetails.expiryDate.length === 5 &&
      cardDetails.cvv.length === 3 &&
      cardDetails.cardholderName.length > 0
    );
  };

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const getStepContent = () => {
    if (!mounted) return null;

    if (!donationType) {
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
              <div className="text-center space-y-3 w-full">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#025EB8]/10 flex items-center justify-center group-hover:bg-[#025EB8]/20 group-hover:scale-110 transition-all duration-200">
                  <img src="https://i.ibb.co/ZwcJcN1/logo.webp" className="h-8 w-8" alt="One time" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("oneTimeDonation")}</h3>
                <p className="text-sm text-gray-500">{t("oneTimeDonationDesc")}</p>
              </div>
            </Button>

            <Button
              onClick={() => handleTypeSelect("MONTHLY")}
              variant="outline"
              className="h-auto p-6 hover:border-[#025EB8] hover:bg-[#025EB8]/5 group transition-all duration-200"
            >
              <div className="text-center space-y-3 w-full">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#025EB8]/10 flex items-center justify-center group-hover:bg-[#025EB8]/20 group-hover:scale-110 transition-all duration-200">
                  <Calendar className="w-7 h-7 text-[#025EB8]" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("monthlyDonation")}</h3>
                <p className="text-sm text-gray-500">{t("monthlyDonationDesc")}</p>
              </div>
            </Button>
          </div>
        </div>
      );
    }

    const steps = getSteps();

    switch (steps[currentStep].title) {
      case t("teamSupport"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("wantToSupportTeam")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("teamSupportHelp")}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="w-full">
                <Input
                  type="number"
                  value={teamSupport || ""}
                  onChange={(e) => setTeamSupport(Number(e.target.value))}
                  placeholder={t("otherAmount")}
                  className={`text-center text-lg font-medium ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 w-full">
                {TEAM_SUPPORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    onClick={() => setTeamSupport(option.value)}
                    className={`transition-all duration-200 ${teamSupport === option.value
                        ? "border-[#025EB8] bg-[#025EB8]/5 text-[#025EB8] shadow-sm"
                        : "hover:border-gray-400"
                      }`}
                  >
                    <span className="font-medium">{option.label === t("noThanks") ? option.label : `${getCurrency()} ${option.value}`}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white"
              >
                {t("next")}
              </Button>
            </div>
          </div>
        );

      case t("paymentFees"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("coverPaymentFees")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("paymentFeesInfo")}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl space-y-3 border border-gray-200">
              <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-gray-600">{t("amount")}</span>
                <span className="font-semibold text-gray-900">
                  {getCurrency()} {amount}
                </span>
              </div>
              {teamSupport > 0 && (
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-gray-600">{t("teamSupport")}</span>
                  <span className="font-semibold text-gray-900">
                    {getCurrency()} {teamSupport}
                  </span>
                </div>
              )}
              <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-gray-600">{t("paymentFeesPercent")}</span>
                <span className="font-semibold text-[#025EB8]">
                  {getCurrency()} {fees.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              dir={isRTL ? "rtl" : "ltr"}
              onClick={() => setCoverFees(!coverFees)}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 ${
                coverFees
                  ? "border-[#025EB8] bg-[#025EB8]/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 mt-0.5 transition-all duration-200 ${
                coverFees ? "bg-[#025EB8] border-[#025EB8] scale-110" : "border-gray-300"
              }`}>
                {coverFees && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 text-start">
                <p className="font-semibold text-gray-900">{t("yesCoverFees")}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t("feesWillBeAdded", { amount: `${getCurrency()} ${fees.toFixed(2)}` })}
                </p>
              </div>
            </button>

            <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white"
              >
                {t("next")}
              </Button>
            </div>
          </div>
        );

      case t("confirmation"):
        return (
          <div className="space-y-6 w-full overflow-hidden">
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("confirmation")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("confirmationDesc")}
              </p>
            </div>

            <div className="space-y-4 w-full">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl space-y-4 border border-gray-200 w-full overflow-hidden">
                {cartItems.map((item) => {
                  const campaignTitle =
                    item.campaign.translations?.find((tr) => tr.locale === locale)?.title ??
                    item.campaign.title;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 w-full min-w-0 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`flex items-center gap-2 flex-1 min-w-0 overflow-hidden ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <img
                          src={item.campaign.images[0]}
                          alt={campaignTitle}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-sm"
                        />
                        <div className={`min-w-0 max-w-48 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <span
                            className="text-gray-900 font-medium text-sm block line-clamp-3"
                            title={campaignTitle}
                          >
                            {campaignTitle}
                          </span>
                          {item.shareCount != null && item.shareCount > 0 && (
                            <span className="text-xs text-violet-700 block mt-0.5">
                              {t("sharesLine", { count: item.shareCount })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm flex-shrink-0 whitespace-nowrap">
                        {getCurrency()} {item.amount}
                      </span>
                    </div>
                  );
                })}
                {teamSupport > 0 && (
                  <div className={`flex items-center gap-2 pt-2 w-full min-w-0 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-gray-600 text-sm flex-1 min-w-0 truncate">{t("teamSupport")}</span>
                    <span className="font-semibold text-gray-900 text-sm flex-shrink-0 whitespace-nowrap">
                      {getCurrency()} {teamSupport}
                    </span>
                  </div>
                )}
                {coverFees && (
                  <div className={`flex items-center gap-2 w-full min-w-0 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-gray-600 text-sm flex-1 min-w-0 truncate">{t("paymentFeesLabel")}</span>
                    <span className="font-semibold text-gray-900 text-sm flex-shrink-0 whitespace-nowrap">
                      {getCurrency()} {fees.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-300">
                  <div className={`flex items-center gap-2 w-full min-w-0 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="font-semibold text-gray-900 text-base flex-1 min-w-0">{t("total")}</span>
                    <span className="font-bold text-[#025EB8] text-lg flex-shrink-0 whitespace-nowrap">
                      {getCurrency()} {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex gap-4 w-full ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white"
              >
                {t("next")}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 leading-relaxed px-2 break-words">
              {t("byContinuing")}{" "}
              <a href="#" className="text-[#025EB8] hover:underline font-medium">{t("termsOfUseLink")}</a>{" "}
              {t("and")}{" "}
              <a href="#" className="text-[#025EB8] hover:underline font-medium">{t("privacyPolicyLink")}</a>
            </p>
          </div>
        );

      case t("paymentMethod"):
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("choosePaymentMethod")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("choosePaymentMethodDesc")}
              </p>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.id}
                  variant="outline"
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`w-full h-auto p-5 transition-all duration-200 ${paymentMethod === method.id
                      ? "border-[#025EB8] bg-[#025EB8]/5 shadow-sm"
                      : "hover:border-gray-400"
                    }`}
                >
                  <div className={`flex items-center gap-4 w-full ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className={`p-3 rounded-lg ${paymentMethod === method.id ? 'bg-[#025EB8]/10' : 'bg-gray-100'} transition-colors duration-200`}>
                      <method.icon className={`w-6 h-6 ${paymentMethod === method.id ? 'text-[#025EB8]' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                disabled={!paymentMethod}
                className="flex-1 bg-[#025EB8] hover:bg-[#014fa0] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("continue")}
              </Button>
            </div>
          </div>
        );

      case t("paymentInfo"):
        return (
          <div className="space-y-6 overflow-visible">
            {paymentMethod === "CARD" ? (
              <div className="space-y-6">
                <div className="flex justify-center mb-6">
                  <div className="transform hover:scale-105 transition-transform duration-200">
                    <Cards
                      number={cardDetails.cardNumber}
                      expiry={cardDetails.expiryDate.replace("/", "")}
                      cvc={cardDetails.cvv}
                      name={cardDetails.cardholderName}
                      focused={focus as "name" | "number" | "expiry" | "cvc"}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t("cardNumber")}
                    </label>
                    <Input
                      type="text"
                      maxLength={16}
                      value={cardDetails.cardNumber}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          cardNumber: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      onFocus={() => setFocus("number")}
                      placeholder={t("cardNumberPlaceholder")}
                      className={`text-lg ${isRTL ? 'text-right' : 'text-left'}`}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t("cardholderName")}
                    </label>
                    <Input
                      type="text"
                      value={cardDetails.cardholderName}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          cardholderName: e.target.value.toUpperCase(),
                        })
                      }
                      onFocus={() => setFocus("name")}
                      placeholder={t("cardholderNamePlaceholder")}
                      className={isRTL ? 'text-right' : 'text-left'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t("expiryDate")}
                      </label>
                      <Input
                        type="text"
                        maxLength={5}
                        value={cardDetails.expiryDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "");
                          if (value.length > 2) {
                            value = value.slice(0, 2) + "/" + value.slice(2);
                          }
                          setCardDetails({
                            ...cardDetails,
                            expiryDate: value,
                          });
                        }}
                        onFocus={() => setFocus("expiry")}
                        placeholder={t("expiryDatePlaceholder")}
                        className="text-center"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t("securityCode")}
                      </label>
                      <Input
                        type="text"
                        maxLength={3}
                        value={cardDetails.cvv}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cvv: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        onFocus={() => setFocus("cvc")}
                        placeholder={t("securityCodePlaceholder")}
                        className="text-center"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#025EB8]/10 rounded-full flex items-center justify-center">
                  <CardIcon className="w-8 h-8 text-[#025EB8]" />
                </div>
                <p className="text-gray-600">
                  {t("paypalRedirect")}
                </p>
              </div>
            )}

            <div className="space-y-2 overflow-visible pt-2 border-t border-border" dir={locale}>
              <label className={`block text-sm font-medium text-gray-700 ${isRTL ? "text-right" : "text-left"}`}>{t("contactPhone")}</label>
              <div className="overflow-visible phone-input-wrapper">
                <PhoneInput
                  defaultCountry="sy"
                  value={phoneValue}
                  onChange={(phone, meta) => {
                    setPhoneValue(phone);
                    setPhoneCountry(meta.country?.name ?? meta.country?.iso2 ?? "");
                  }}
                  className="w-full overflow-visible"
                  inputClassName={`w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${isRTL ? "text-right" : "text-left"}`}
                  required
                />
              </div>
            </div>

            <div className={`flex gap-4 ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {t("back")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !isPhoneValid() ||
                  (paymentMethod === "CARD" && !isCardDetailsValid())
                }
                className="flex-1 bg-[#FA5D17] hover:bg-[#e04d0f] text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("confirmDonation")
                )}
              </Button>
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
          country: phoneCountry || undefined,
        });
      }
      const items = await Promise.all(
        cartItems.map(async (item) => ({
          campaignId: item.campaign.id,
          amount: item.amount,
          amountUSD:
            item.amountUSD != null && item.amountUSD > 0
              ? item.amountUSD
              : await useConvetToUSD(item.amount, getCurrency()),
          ...(item.shareCount != null && item.shareCount > 0
            ? { shareCount: item.shareCount }
            : {}),
        }))
      );

      const donationData: Record<string, unknown> = {
        items,
        currency: getCurrency(),
        teamSupport,
        coverFees,
        type: "ONE_TIME" as DonationType,
        paymentMethod,
        cardDetails: paymentMethod === "CARD" ? cardDetails : null,
        locale,
      };
      const refCode = getReferralCode();
      if (refCode) donationData.referralCode = refCode;

      const response = await axios.post("/api/cart/payment", donationData);

      if (response.data) {
        isRedirecting = true;
        setRedirecting(true);
        clearItems();
        confetti.onOpen();
        router.push(`/success/${response.data.donation.id}`);
        return;
      }
      onClose();
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error(t("donationFailed"));
    } finally {
      if (!isRedirecting) setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] max-h-screen overflow-y-auto overflow-x-hidden p-0 rounded-none sm:rounded-lg top-0 sm:top-[50%] translate-y-0 sm:translate-y-[-50%]" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("confirmation")}</DialogTitle>
        {mounted && (
          <>
            {/* Branded header */}
            <div className="relative h-24 overflow-hidden rounded-t-lg bg-[#025EB8]">
              <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">{t("confirmation")}</p>
                <h2 className="text-white font-bold text-base">{t("paymentMethod")}</h2>
              </div>
            </div>
            {/* Step progress bar */}
            {donationType && renderStepIndicator()}
            <div className="relative z-10 px-6 pb-6 bg-white overflow-visible">
              <AnimatePresence mode="wait">
                <motion.div
                  key={redirecting ? "redirecting" : currentStep}
                  className="overflow-visible"
                  initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {redirecting ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-[#025EB8]/8 flex items-center justify-center">
                          <CardIcon className="h-9 w-9 text-[#025EB8]" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-[#025EB8]/20 rounded-full flex items-center justify-center">
                          <ExternalLink className="h-3 w-3 text-[#025EB8]" />
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {t("successRedirecting")}
                        </p>
                        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                          {t("successRedirectingDesc")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#025EB8] bg-[#025EB8]/6 px-4 py-2 rounded-full">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>جارٍ الاتصال بالبوابة…</span>
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