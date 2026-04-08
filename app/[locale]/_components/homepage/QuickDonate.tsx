import React, { useState, useEffect, useRef } from "react";
import { Heart, TrendingUp, Users, Award, CheckCircle, ArrowLeft, Sparkles, ChevronDown, Check } from "lucide-react";
import { getCurrency } from "@/hooks/useCampaignValue";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import DonationDialog from "@/components/DonationDialog";
import SignInDialog from "@/components/SignInDialog";
import { Link } from "@/i18n/routing";

interface CategoryOption {
  id: string;
  name: string;
  image?: string | null;
}

const QUICK_DONATE_RESUME_KEY = "quickDonateResume";

const QuickDonate = () => {
  const t = useTranslations("QuickDonate");
  const locale = useLocale() as "ar" | "en" | "fr";
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [currencyLabel, setCurrencyLabel] = useState<string>("USD");
  const [resumeAmount, setResumeAmount] = useState<number | undefined>(undefined);
  const [resumeCategoryId, setResumeCategoryId] = useState<string>("");
  const [resumeCategoryName, setResumeCategoryName] = useState<string>("");
  const [resumeCategoryImage, setResumeCategoryImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCurrencyLabel(getCurrency());
  }, []);

  // After sign-in redirect: restore selection, open donation dialog, clean URL
  useEffect(() => {
    if (searchParams.get("openDonation") !== "1") return;
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(QUICK_DONATE_RESUME_KEY) : null;
      if (stored) {
        const data = JSON.parse(stored) as { categoryId?: string; categoryName?: string; categoryImage?: string; amount?: number };
        if (data.categoryId) setResumeCategoryId(data.categoryId);
        if (data.categoryName) setResumeCategoryName(data.categoryName);
        if (data.categoryImage) setResumeCategoryImage(data.categoryImage);
        if (typeof data.amount === "number" && data.amount > 0) setResumeAmount(data.amount);
        sessionStorage.removeItem(QUICK_DONATE_RESUME_KEY);
      }
    } catch {
      /* ignore */
    }
    setDonationDialogOpen(true);
    router.replace(`${pathname}#quick_donate`);
  }, [searchParams, pathname, router]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch categories with locale for translations
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`/api/categories?locale=${locale}&limit=100`);
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []).map((c: { id: string; name: string; image?: string | null }) => ({
          id: c.id,
          name: c.name || "",
          image: c.image ?? null,
        }));
        setCategories(items);
        if (items.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(items[0].id);
        }
      } catch (e) {
        console.error("Failed to fetch categories:", e);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, [locale]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const displayAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) || 0 : 0);

  const handleDonateClick = () => {
    if (!selectedCategoryId || !selectedCategory) return;
    if (displayAmount <= 0) return;
    if (session) {
      setDonationDialogOpen(true);
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          QUICK_DONATE_RESUME_KEY,
          JSON.stringify({
            categoryId: selectedCategoryId,
            categoryName: selectedCategory.name,
            categoryImage: selectedCategory.image ?? undefined,
            amount: displayAmount,
          })
        );
      }
      setSignInOpen(true);
    }
  };

  const stats = [
    { icon: Users, value: "50,000+", labelKey: "stat1" as const },
    { icon: Award, value: "250+", labelKey: "stat2" as const },
    { icon: Heart, value: "13", labelKey: "stat3" as const },
    { icon: TrendingUp, value: "95%", labelKey: "stat4" as const },
  ];

  const featureKeys = ["feature1", "feature2", "feature3", "feature4"] as const;

  const quickAmounts = [100, 200, 300, 400, 500, 1000];

  return (
    <div id="quick_donate" className="relative rounded-none lg:rounded-2xl overflow-hidden shadow-xl">

      {/* Full-bleed background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#014fa0]/80 via-[#014fa0]/60 to-[#014fa0]/40" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
      {/* <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FA5D17]" /> */}

      {/* Content — mobile: card first, text second; lg: side by side */}
      <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 p-5 sm:p-8 lg:p-12 items-center">

        {/* ── Donation card — ORDER 2 on mobile, ORDER 2 on desktop ── */}
        <div className="order-2 lg:order-2 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="bg-[#025EB8] px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white leading-tight">{t("monthlyCommitment")}</h3>
                <p className="text-white/70 text-[11px] mt-0.5">{t("monthlyCommitmentDesc")}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
              {/* Category */}
              <div ref={categoryDropdownRef} className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("selectProject")}</label>
                <button
                  type="button"
                  onClick={() => !categoriesLoading && setCategoryDropdownOpen((o) => !o)}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                    categoryDropdownOpen
                      ? "border-[#025EB8] ring-2 ring-[#025EB8]/20 bg-white"
                      : "border-gray-200 bg-gray-50 hover:border-[#025EB8]/50"
                  } ${categoriesLoading ? "opacity-60 pointer-events-none" : ""}`}
                >
                  {categoriesLoading ? (
                    <span className="text-gray-400 text-xs animate-pulse">...</span>
                  ) : (
                    <span className="text-gray-900 truncate text-start">
                      {selectedCategory?.name ?? ""}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-[#025EB8] flex-shrink-0 transition-transform duration-200 ${categoryDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {categoryDropdownOpen && !categoriesLoading && (
                  <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {categories.map((cat) => {
                        const isSelected = cat.id === selectedCategoryId;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            dir={locale === "ar" ? "rtl" : "ltr"}
                            onClick={() => { setSelectedCategoryId(cat.id); setCategoryDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors text-start ${
                              isSelected
                                ? "bg-[#025EB8]/8 text-[#025EB8] font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#025EB8] flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick amounts — 3 cols always, amounts shrink on tiny screens */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("selectAmount")}</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {quickAmounts.map((amount, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                      dir="ltr"
                      className={`py-2 rounded-lg font-bold text-xs sm:text-sm transition-all border ${
                        selectedAmount === amount
                          ? "bg-[#025EB8] text-white border-[#025EB8] shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#025EB8] hover:text-[#025EB8]"
                      }`}
                    >
                      {amount} {currencyLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t("customAmount")}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                    placeholder={t("enterAmount")}
                    className={`w-full py-2.5 rounded-lg bg-gray-50 text-gray-900 border border-gray-200 focus:border-[#025EB8] focus:outline-none focus:ring-2 focus:ring-[#025EB8]/20 transition-all text-sm ${locale === "ar" ? "pl-12 pr-3" : "pl-3 pr-12"}`}
                  />
                  <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold ${locale === "ar" ? "left-3" : "right-3"}`}>{currencyLabel}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleDonateClick}
                disabled={!selectedCategoryId || displayAmount <= 0 || categoriesLoading}
                className="w-full bg-[#FA5D17] hover:bg-[#e04d0f] text-white py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:pointer-events-none"
              >
                {t("donateNow")}
                <Heart className="w-4 h-4" fill="currentColor" />
              </button>

              {/* Trust */}
              <div className="flex items-center justify-center gap-1.5 text-gray-400 text-[11px]">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span>{t("secureTransactions")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Text content — ORDER 2 on mobile, ORDER 1 on desktop ── */}
        <div className="order-1 flex flex-col gap-5 sm:gap-6 text-white">
          {/* Badge + heading */}
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold border border-white/25">
              <Heart className="w-3.5 h-3.5 text-[#FA5D17]" fill="currentColor" />
              <span>{t("associationName")}</span>
            </div>

            <div className="space-y-2">
              <p className="text-white/80 text-xs tracking-wide uppercase font-semibold">{t("hadithQuote")}</p>
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-extrabold leading-snug">
                {t("hadithText")}
              </h2>
              <div className="w-12 h-1 bg-[#FA5D17] rounded-full" />
            </div>

            <p className="text-white/75 text-sm leading-relaxed hidden sm:block">{t("description")}</p>
          </div>

          {/* Features — hidden on mobile to keep it clean */}
          <div className="hidden sm:grid grid-cols-2 gap-y-2.5 gap-x-4">
            {featureKeys.map((key, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#FA5D17] mt-0.5 shrink-0" />
                <span className="text-white text-xs">{t(key)}</span>
              </div>
            ))}
          </div>

          <Link href="/about-us" className="hidden sm:inline-flex group items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/30 px-3 py-2 rounded-lg font-semibold text-xs transition-all w-fit">
            {t("discoverMore")}
          </Link>

          {/* Stats — 2 cols on mobile, 4 on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 border border-white/15">
                  <Icon className="w-4 h-4 text-[#FA5D17] mx-auto mb-1" />
                  <div className="text-sm sm:text-base font-extrabold">{stat.value}</div>
                  <div className="text-[10px] text-white/80 leading-tight mt-0.5">{t(stat.labelKey)}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <SignInDialog
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        callbackUrl={
          typeof window !== "undefined"
            ? `${window.location.pathname}?openDonation=1#quick_donate`
            : undefined
        }
      />

      <DonationDialog
        isOpen={donationDialogOpen}
        onClose={() => {
          setDonationDialogOpen(false);
          setResumeAmount(undefined);
          setResumeCategoryId("");
          setResumeCategoryName("");
          setResumeCategoryImage(undefined);
        }}
        monthlyOnly
        categoryId={resumeCategoryId || selectedCategoryId}
        categoryName={resumeCategoryName || (selectedCategory?.name ?? "")}
        categoryImage={resumeCategoryImage ?? selectedCategory?.image ?? undefined}
        initialDonationAmount={resumeAmount ?? (displayAmount > 0 ? displayAmount : undefined)}
      />
    </div>
  );
};

export default QuickDonate;
