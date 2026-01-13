import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Calendar,
  CreditCard as CardIcon,
  Check,
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

type DonationType = "ONE_TIME";
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

const DONATION_STEPS: Record<DonationType, DonationStep[]> = {
  ONE_TIME: [
    { title: "دعم الفريق", subtitle: "ساعدنا في تطوير المنصة" },
    { title: "رسوم الدفع", subtitle: "تغطية رسوم عملية الدفع" },
    { title: "التأكيد", subtitle: "مراجعة التبرع" },
    { title: "طريقة الدفع", subtitle: "اختر طريقة الدفع المناسبة" },
    { title: "معلومات الدفع", subtitle: "ادخل معلومات الدفع الخاصة بك" },
  ],
};

const TEAM_SUPPORT_OPTIONS = [
  { label: "لا شكراً", value: 0 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

const PAYMENT_METHODS = [
  {
    id: "CARD",
    name: "البطاقة البنكية",
    icon: CardIcon,
    description: "الدفع باستخدام بطاقة الائتمان أو الخصم",
  },
  {
    id: "PAYPAL",
    name: "PayPal",
    icon: CardIcon,
    description: "الدفع باستخدام حساب PayPal",
  },
];

interface CartItem {
  id: string;
  amount: number;
  campaign: {
    id: string;
    title: string;
    images: string[];
  };
}

interface CartPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  amount: number;
}

const CartPaymentDialog = ({ isOpen, onClose, cartItems, amount }: CartPaymentDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [donationType, setDonationType] = useState<DonationType | null>(
    "ONE_TIME"
  );
  const [teamSupport, setTeamSupport] = useState<number>(0);
  const [coverFees, setCoverFees] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
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
      if (steps[currentStep].title === "طريقة الدفع") {
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
                ? "bg-emerald-500"
                : index < currentStep
                ? "bg-emerald-200"
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

    if (!donationType) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              اختر نوع التبرع
            </h2>
            <p className="text-gray-600">
              يمكنك اختيار التبرع لمرة واحدة أو التبرع الشهري
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleTypeSelect("ONE_TIME")}
              variant="outline"
              className="h-auto p-6 hover:border-emerald-500 hover:bg-emerald-50 group"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <img src="https://i.ibb.co/ZwcJcN1/logo.webp" className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-gray-900">تبرع لمرة واحدة</h3>
                <p className="text-sm text-gray-500">تبرع مرة واحدة للحملة</p>
              </div>
            </Button>

            <Button
              onClick={() => handleTypeSelect("MONTHLY")}
              variant="outline"
              className="h-auto p-6 hover:border-emerald-500 hover:bg-emerald-50 group"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">تبرع شهري</h3>
                <p className="text-sm text-gray-500">تبرع بشكل شهري للحملة</p>
              </div>
            </Button>
          </div>
        </div>
      );
    }

    const steps = getSteps();

    switch (steps[currentStep].title) {
      case "دعم الفريق":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                هل تريد دعم فريق العمل؟
              </h3>
              <p className="text-gray-600 text-sm">
                تبرعك يساعدنا في تطوير المنصة وتحسين خدماتنا
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Input
                type="number"
                value={teamSupport || ""}
                onChange={(e) => setTeamSupport(Number(e.target.value))}
                placeholder="مبلغ آخر"
              />
              <div className="grid grid-cols-3 gap-3 w-full">
                {TEAM_SUPPORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    onClick={() => setTeamSupport(option.value)}
                    className={`${
                      teamSupport === option.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
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
                رجوع
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                التالي
              </Button>
            </div>
          </div>
        );

      case "رسوم الدفع":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                تغطية رسوم الدفع
              </h3>
              <p className="text-gray-600 text-sm">
                رسوم خدمة الدفع الإلكتروني تبلغ 3% من إجمالي المبلغ
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">مبلغ التبرع</span>
                <span className="font-medium">
                  {getCurrency()} {amount}
                </span>
              </div>
              {teamSupport > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">دعم الفريق</span>
                  <span className="font-medium">
                    {getCurrency()} {teamSupport}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">رسوم الدفع (3%)</span>
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
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start text-right gap-2">
                <div
                  className={`w-5 h-5 flex justify-center items-center rounded-full border-2 flex-shrink-0 mr-3 mt-0.5 ${
                    coverFees
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-gray-300"
                  }`}
                >
                  {coverFees && <Check className="w-1 h-1 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    نعم، أريد تغطية رسوم الدفع
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    سيتم إضافة {getCurrency()} {fees.toFixed(2)} لتغطية رسوم
                    الدفع
                  </p>
                </div>
              </div>
            </Button>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                رجوع
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                التالي
              </Button>
            </div>
          </div>
        );

      case "التأكيد":
        return (
          <div className="space-y-6">
            <div className="space-y-4 flex items-center justify-center flex-col">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between"></div>
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 max-w-[80%]">
                      <img
                        src={item.campaign.images[0]}
                        alt={item.campaign.title}
                        width={50}
                        height={50}
                        className="rounded-md"
                      />
                      <span className="text-black font-medium text-sm truncate">
                        {item.campaign.title}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {getCurrency()} {item.amount}
                    </span>
                  </div>
                ))}
                {teamSupport > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">دعم الفريق</span>
                    <span className="font-medium text-gray-900">
                      {getCurrency()} {teamSupport}
                    </span>
                  </div>
                )}
                {coverFees && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">رسوم الدفع</span>
                    <span className="font-medium text-gray-900">
                      {getCurrency()} {fees.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">الإجمالي</span>
                    <span className="font-bold text-emerald-600 text-lg">
                      {getCurrency()} {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                رجوع
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                التالي
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية
            </p>
          </div>
        );
      // Fall through to payment method selection if not monthly

      case "طريقة الدفع":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                اختر طريقة الدفع
              </h3>
              <p className="text-gray-600 text-sm">
                اختر الطريقة المناسبة لك لإتمام عملية التبرع
              </p>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.id}
                  variant="outline"
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`w-full h-auto p-4 ${
                    paymentMethod === method.id
                      ? "border-emerald-500 bg-emerald-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <method.icon className="w-5 h-5" />
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-500">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                رجوع
              </Button>
              <Button
                onClick={handleNext}
                disabled={!paymentMethod}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                متابعة
              </Button>
            </div>
          </div>
        );

      case "معلومات الدفع":
        return (
          <div className="space-y-6 ">
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
                      رقم البطاقة
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
                      placeholder="0000 0000 0000 0000"
                      className="text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم حامل البطاقة
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
                      placeholder="الاسم كما يظهر على البطاقة"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الانتهاء
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
                        placeholder="MM/YY"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رمز الأمان
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
                        placeholder="CVV"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600">
                  سيتم تحويلك إلى PayPal لإتمام عملية الدفع
                </p>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                رجوع
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={paymentMethod === "CARD" && !isCardDetailsValid()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                تأكيد التبرع
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
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
        clearItems();
        
        onClose();
        router.push(`/success/${response.data.donation.id}`);
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error("فشل في عملية التبرع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto p-0">
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
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {getStepContent()}
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
