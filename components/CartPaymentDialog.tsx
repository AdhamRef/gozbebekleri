import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Calendar,
  CreditCard as CardIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import axios from "axios";
import Cards from "react-credit-cards-2";
import "react-credit-cards-2/dist/es/styles-compiled.css";
import { toast } from "react-hot-toast";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { getCurrency } from "@/hooks/useCampaignValue";
import { useCart } from "@/hooks/useCart";
import useConvetToUSD from "@/hooks/useConvetToUSD";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";

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

  const { clearItems } = useCart();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentStep
                ? "bg-blue-500 w-8"
                : index < currentStep
                  ? "bg-blue-300"
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
              className="h-auto p-6 hover:border-blue-500 hover:bg-blue-50 group transition-all duration-200"
            >
              <div className="text-center space-y-3 w-full">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-200">
                  <img src="https://i.ibb.co/ZwcJcN1/logo.webp" className="h-8 w-8" alt="One time" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("oneTimeDonation")}</h3>
                <p className="text-sm text-gray-500">{t("oneTimeDonationDesc")}</p>
              </div>
            </Button>

            <Button
              onClick={() => handleTypeSelect("MONTHLY")}
              variant="outline"
              className="h-auto p-6 hover:border-blue-500 hover:bg-blue-50 group transition-all duration-200"
            >
              <div className="text-center space-y-3 w-full">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-200">
                  <Calendar className="w-7 h-7 text-blue-600" />
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
                        ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
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
                <span className="font-semibold text-blue-600">
                  {getCurrency()} {fees.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setCoverFees(!coverFees)}
              className={`w-full h-auto p-4 transition-all duration-200 ${coverFees
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-400"
                }`}
            >
              <div className={`flex items-start gap-3 w-full ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <div
                  className={`w-6 h-6 flex justify-center items-center rounded-full border-2 flex-shrink-0 transition-all duration-200 ${coverFees
                      ? "bg-blue-500 border-blue-500 scale-110"
                      : "border-gray-300"
                    }`}
                >
                  {coverFees && <Check className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {t("yesCoverFees")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("feesWillBeAdded", { amount: `${getCurrency()} ${fees.toFixed(2)}` })}
                  </p>
                </div>
              </div>
            </Button>

            <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
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
                        <span
                          className={`text-gray-900 font-medium text-sm block line-clamp-3 min-w-0 max-w-48 ${isRTL ? 'text-right' : 'text-left'}`}
                          title={campaignTitle}
                        >
                          {campaignTitle}
                        </span>
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
                    <span className="font-bold text-blue-600 text-lg flex-shrink-0 whitespace-nowrap">
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t("next")}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 leading-relaxed px-2 break-words">
              {t("byContinuing")}{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">{t("termsOfUseLink")}</a>{" "}
              {t("and")}{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">{t("privacyPolicyLink")}</a>
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
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "hover:border-gray-400"
                    }`}
                >
                  <div className={`flex items-center gap-4 w-full ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className={`p-3 rounded-lg ${paymentMethod === method.id ? 'bg-blue-100' : 'bg-gray-100'} transition-colors duration-200`}>
                      <method.icon className={`w-6 h-6 ${paymentMethod === method.id ? 'text-blue-600' : 'text-gray-600'}`} />
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <CardIcon className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600">
                  {t("paypalRedirect")}
                </p>
              </div>
            )}

            <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <BackIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
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

      // Convert cart items to donation items format
      const items = await Promise.all(cartItems.map(async (item) => ({
        campaignId: item.campaign.id,
        amount: item.amount,
        amountUSD: await useConvetToUSD(item.amount, getCurrency()),
      })));

      const donationData = {
        items,
        currency: getCurrency(),
        teamSupport,
        coverFees,
        type: "ONE_TIME" as DonationType,
        paymentMethod,
        cardDetails: paymentMethod === "CARD" ? cardDetails : null,
      };

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("confirmation")}</DialogTitle>
        {mounted && (
          <>
            <div className="p-6 pb-4">
              {donationType && renderStepIndicator()}
            </div>
            <div className="relative z-10 px-6 pb-6 bg-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={redirecting ? "redirecting" : currentStep}
                  initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
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

export default CartPaymentDialog;