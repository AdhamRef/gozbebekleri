import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Heart,
  CreditCard as CardIcon,
  ShoppingCart,
  Check,
  Loader2,
} from "lucide-react";
import axios from "axios";
import Cards from "react-credit-cards-2";
import "react-credit-cards-2/dist/es/styles-compiled.css";
import { toast } from "react-hot-toast";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { getCurrency } from "@/hooks/useCampaignValue";
import useConvetToUSD from "@/hooks/useConvetToUSD";
import { useCurrency } from "@/context/CurrencyContext";
import { formatNumber } from "@/hooks/formatNumber";
import { useCart } from "@/hooks/useCart";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";

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
}

interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

const DonationDialog = ({
  isOpen,
  onClose,
  campaignTitle = "",
  campaignId = "",
  campaignImage = "/placeholder.jpg",
  targetAmount = 0,
  amountRaised = 0,
  monthlyOnly = false,
  categoryId = "",
  categoryName = "",
  categoryImage,
  initialDonationAmount,
}: DonationDialogProps) => {
  const isCategoryMode = Boolean(categoryId);
  const t = useTranslations("DonationDialog");
  const locale = useLocale() as "ar" | "en" | "fr";
  
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

  const PAYMENT_METHODS = [
    {
      id: "CARD",
      name: t("bankCard"),
      icon: CardIcon,
      description: t("cardDescription"),
    },
    {
      id: "PAYPAL",
      name: "PayPal",
      icon: CardIcon,
      description: t("paypalDescription"),
    },
  ];

  const DONATION_STEPS: Record<DonationType, DonationStep[]> = {
    ONE_TIME: [
      { title: t("donationAmount"), subtitle: t("donationAmountDesc") },
      { title: t("teamSupport"), subtitle: t("teamSupportDesc") },
      { title: t("paymentFees"), subtitle: t("paymentFeesDesc") },
      { title: t("confirmation"), subtitle: t("confirmationDesc") },
      { title: t("paymentMethod"), subtitle: t("paymentMethodDesc") },
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
      { title: t("paymentMethod"), subtitle: t("paymentMethodDesc") },
      { title: t("paymentInfo"), subtitle: t("paymentInfoDesc") },
    ],
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [donationType, setDonationType] = useState<DonationType | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [teamSupport, setTeamSupport] = useState<number>(0);
  const [coverFees, setCoverFees] = useState(false);
  const [billingDay, setBillingDay] = useState<number>(1);
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
  const { convertToCurrency } = useCurrency();
  const { addItem, setItems } = useCart();

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // When monthlyOnly (e.g. QuickDonate category), pre-select monthly and skip type step
  useEffect(() => {
    if (isOpen && monthlyOnly && !donationType) {
      setDonationType("MONTHLY");
      setCurrentStep(0);
    }
  }, [isOpen, monthlyOnly, donationType]);

  // Pre-fill amount and skip amount step when opening with initialDonationAmount (e.g. from QuickDonate)
  useEffect(() => {
    if (isOpen && initialDonationAmount != null && initialDonationAmount > 0) {
      setDonationAmount(initialDonationAmount);
      setCurrentStep(1); // skip first step (donation amount)
    }
  }, [isOpen, initialDonationAmount]);

  const confetti = useConfettiStore();

  const progress =
    ((amountRaised + donationAmount) /
      convertToCurrency(targetAmount).convertedValue) *
    100;
  const fees = (donationAmount + teamSupport) * 0.03;
  const totalAmount = donationAmount + teamSupport + (coverFees ? fees : 0);

  const handleTypeSelect = (type: DonationType) => {
    setDonationType(type);
    setCurrentStep(0);
  };

  const handleNext = () => {
    const steps = getSteps();
    if (currentStep < steps.length - 1) {
      if (steps[currentStep].title === t("paymentMethod")) {
        setCurrentStep(currentStep + 1);
      } else {
        setCurrentStep(currentStep + 1);
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

  const getSteps = () => {
    return donationType ? DONATION_STEPS[donationType] : [];
  };

  const renderStepIndicator = () => {
    const steps = getSteps();
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              index === currentStep
                ? "bg-blue-500"
                : index < currentStep
                ? "bg-blue-200"
                : "bg-gray-200"
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

  const getStepContent = () => {
    if (!mounted) return null;

    if (!donationType && !monthlyOnly) {
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
              className="h-auto p-6 hover:border-blue-500 hover:bg-blue-50 group"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("oneTimeDonation")}</h3>
                <p className="text-sm text-gray-500">{t("oneTimeDonationDesc")}</p>
              </div>
            </Button>

            <Button
              onClick={() => handleTypeSelect("MONTHLY")}
              variant="outline"
              className="h-auto p-6 hover:border-blue-500 hover:bg-blue-50 group"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-6 h-6 text-blue-600" />
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
                <span className="text-blue-600 text-base">
                  {t("hadithText")}
                </span>
              </p>
            </div>
            {donationType === "ONE_TIME" && campaignId && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("collected")} {getCurrency()}
                    {formatNumber(
                      convertToCurrency(Math.round(amountRaised))
                        .convertedValue + donationAmount
                    )}
                  </span>
                  <span className="text-gray-600">
                    {t("goal")} {getCurrency()}
                    {formatNumber(
                      convertToCurrency(Math.round(targetAmount)).convertedValue
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full max-w-full transition-all duration-500 ease-in-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Input
                type="number"
                value={donationAmount || ""}
                onChange={(e) => setDonationAmount(Number(e.target.value))}
                placeholder={t("enterDonationAmount")}
              />

              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50, 100, 250, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setDonationAmount(amount)}
                    className={`${
                      donationAmount === amount
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    {getCurrency()} {amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-4 mt-6">
              {!isCategoryMode && campaignId && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await axios.post("/api/cart", {
                        campaignId: campaignId,
                        amount: donationAmount,
                        amountUSD: useConvetToUSD(donationAmount, getCurrency()),
                        currency: getCurrency(),
                      });
                      addItem(response.data || []);
                      window.location.reload();
                    } catch (error) {
                      console.error("Error adding to cart:", error);
                      toast.error(t("failedToAddToCart"));
                    } finally {
                      onClose();
                    }
                  }}
                  className="flex-1 flex justify-center items-center gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200 !border-none !shadow-none"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t("addToCart")}
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!donationAmount}
                className={`${isCategoryMode || !campaignId ? "w-full" : "flex-1"} bg-blue-600 hover:bg-blue-700 text-white`}
              >
                {t("next")}
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
                value={teamSupport || ""}
                onChange={(e) => setTeamSupport(Number(e.target.value))}
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
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    {getCurrency()} {option.value}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
              <h3 className="text-lg font-semibold text-gray-900">
                {t("coverPaymentFees")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("paymentFeesInfo")}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("amount")}</span>
                <span className="font-medium">
                  {" "}
                  {getCurrency()} {formatNumber(donationAmount)}
                </span>
              </div>
              {teamSupport > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("teamSupport")}</span>
                  <span className="font-medium">
                    {getCurrency()} {formatNumber(teamSupport)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("paymentFeesPercent")}</span>
                <span className="font-medium">
                  {getCurrency()} {fees.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setCoverFees(!coverFees)}
              className={`w-full h-auto p-4 !justify-start ${
                coverFees
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start text-right gap-2 ">
                <div
                  className={`w-5 h-5 flex justify-center items-center rounded-full border-2 flex-shrink-0 mr-3 mt-0.5 ${
                    coverFees
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {coverFees && <Check className="w-1 h-1 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t("yesCoverFees")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("feesWillBeAdded", { amount: `${getCurrency()} ${fees.toFixed(2)}` })}
                  </p>
                </div>
              </div>
            </Button>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t("next")}
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
                  src={isCategoryMode ? (categoryImage || "/placeholder.jpg") : campaignImage}
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
                <span className="font-medium text-gray-900">
                  {getCurrency()} {formatNumber(donationAmount)}
                </span>
              </div>
              {teamSupport > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t("teamSupport")}</span>
                  <span className="font-medium text-gray-900">
                    {getCurrency()} {formatNumber(teamSupport)}
                  </span>
                </div>
              )}
              {coverFees && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t("paymentFeesLabel")}</span>
                  <span className="font-medium text-gray-900">
                    {getCurrency()} {fees.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{t("total")}</span>
                  <span className="font-bold text-blue-600 text-xl">
                    {getCurrency()} {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons Section */}
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 py-3 text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t("next")}
              </Button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-center text-gray-500 mt-4">
              {t("byContinuing")}{" "}
              <a href="#" className="text-blue-600 hover:underline">
                {t("termsOfUseLink")}
              </a>{" "}
              {t("and")}{" "}
              <a href="#" className="text-blue-600 hover:underline">
                {t("privacyPolicyLink")}
              </a>
            </p>
          </div>
        );

      case t("billingDay"):
        if (donationType === "MONTHLY") {
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
                        ? "border-blue-500 bg-blue-50 text-blue-600"
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
                  className="flex-1"
                >
                  {t("back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          );
        }
      // Fall through to payment method selection if not monthly

      case t("paymentMethod"):
        return (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">
                {t("choosePaymentMethod")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("choosePaymentMethodDesc")}
              </p>
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-4">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`w-full p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                    paymentMethod === method.id
                      ? "border border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md"
                      : "border border-gray-200 hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon with Colorful Background */}
                    <div
                      className={`p-3 rounded-lg ${
                        paymentMethod === method.id
                          ? "bg-gradient-to-bl from-blue-500 to-indigo-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <method.icon
                        className={`w-6 h-6 ${
                          paymentMethod === method.id
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      />
                    </div>

                    {/* Method Details */}
                    <div className="text-right flex-1">
                      <p className="font-medium text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-500">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons Section */}
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 py-3 text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                {t("back")}
              </Button>
              <Button
                onClick={handleNext}
                disabled={!paymentMethod}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                {t("continue")}
              </Button>
            </div>
          </div>
        );
      case t("paymentInfo"):
        return (
          <div className="space-y-6">
            {paymentMethod === "CARD" ? (
              <div className="space-y-6">
                <div className="flex justify-center mb-6">
                  <Cards
                    number={cardDetails.cardNumber}
                    expiry={cardDetails.expiryDate.replace("/", "")}
                    cvc={cardDetails.cvv}
                    name={cardDetails.cardholderName}
                    focused={focus as "name" | "number" | "expiry" | "cvc"}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600">
                  {t("paypalRedirect")}
                </p>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {t("back")}
              </Button>
              <Button
  onClick={handleSubmit}
  disabled={
    loading ||
    (paymentMethod === "CARD" && !isCardDetailsValid())
  }
  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
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
      const amountUSD = await useConvetToUSD(donationAmount, getCurrency());
      const donationData: Record<string, unknown> = {
        currency: getCurrency(),
        teamSupport,
        coverFees,
        type: donationType,
        paymentMethod,
        cardDetails: paymentMethod === "CARD" ? cardDetails : null,
        billingDay: donationType === "MONTHLY" ? billingDay : null,
      };
      if (isCategoryMode && categoryId) {
        donationData.categoryItems = [
          { categoryId, amount: donationAmount, amountUSD },
        ];
      } else if (campaignId) {
        donationData.items = [
          { campaignId, amount: donationAmount, amountUSD },
        ];
      }

      const response = await axios.post("/api/donations", donationData);

      if (response.data.success) {
        isRedirecting = true;
        setRedirecting(true);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("donationAmount")}</DialogTitle>
        {mounted && (
          <>
            <div className="p-6 pb-0">
              {donationType && (
                <>
                  {/* {renderStepIndicator()}
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">
                        {getSteps()[currentStep].title}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {getSteps()[currentStep].subtitle}
                      </p>
                    </div> */}
                </>
              )}
            </div>
            <div className="relative z-10 p-6 pt-0 bg-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={redirecting ? "redirecting" : currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {redirecting ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                      <CheckCircle2 className="h-16 w-16 text-green-500" />
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {t("successRedirecting")}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {t("successRedirectingDesc")}
                        </p>
                      </div>
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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