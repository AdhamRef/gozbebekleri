import React, { useState, useEffect } from "react";
import { Heart, TrendingUp, Users, Award, CheckCircle, ArrowLeft, Sparkles } from "lucide-react";
import { getCurrency } from "@/hooks/useCampaignValue";
import { useTranslations, useLocale } from "next-intl";
import DonationDialog from "@/components/DonationDialog";

interface CategoryOption {
  id: string;
  name: string;
  image?: string | null;
}

const QuickDonate = () => {
  const t = useTranslations("QuickDonate");
  const locale = useLocale() as "ar" | "en" | "fr";
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [currencyLabel, setCurrencyLabel] = useState<string>("USD");

  useEffect(() => {
    setCurrencyLabel(getCurrency());
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
    setDonationDialogOpen(true);
  };

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || "";
  };

  const stats = [
    { icon: Users, value: "50,000+", labelAr: "مستفيد", labelEn: "Beneficiary", labelFr: "Bénéficiaire" },
    { icon: Award, value: "250+", labelAr: "مشروع خيري", labelEn: "Charity Project", labelFr: "Projet caritatif" },
    { icon: Heart, value: "13", labelAr: "سنة من العطاء", labelEn: "Years of Giving", labelFr: "Années de don" },
    { icon: TrendingUp, value: "95%", labelAr: "نسبة الشفافية", labelEn: "Transparency Rate", labelFr: "Taux de transparence" }
  ];

  const features = [
    { textAr: "توصيل المساعدات للمحتاجين مباشرة", textEn: "Direct delivery of aid to those in need", textFr: "Livraison directe de l'aide aux nécessiteux" },
    { textAr: "تقارير شفافة لكل مشروع", textEn: "Transparent reports for each project", textFr: "Rapports transparents pour chaque projet" },
    { textAr: "فريق محترف ومتخصص", textEn: "Professional and specialized team", textFr: "Équipe professionnelle et spécialisée" },
    { textAr: "شراكات دولية موثوقة", textEn: "Trusted international partnerships", textFr: "Partenariats internationaux de confiance" }
  ];

  const quickAmounts = [100, 200, 300, 400, 500, 1000];

  return (
    <div className="relative min-h-[60vh] lg:min-h-[70vh] overflow-hidden" id="quick_donate">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg"
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/75 to-slate-900/80"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <section className="relative z-10 container max-w-7xl mx-auto py-6 lg:py-8 px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-3 lg:space-y-4 text-white">
            <div className="inline-flex items-center gap-2 bg-sky-500/30 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-sky-300/50">
              <Heart className="w-3.5 h-3.5 text-sky-200" fill="currentColor" />
              <span className="text-sky-50">{t("associationName")}</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight flex flex-col gap-2">
                <span className="text-sky-100 text-sm drop-shadow-md">{t("hadithQuote")}</span>
                <span className="text-white drop-shadow-lg mt-1">{t("hadithText")}</span>
              </h1>
            </div>

            <p className="text-base leading-relaxed text-white drop-shadow-md">
              {t("description")}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-sky-300 mt-0.5 drop-shadow-md" />
                  <span className="text-white text-xs drop-shadow-md">{getLocalizedProperty(feature, "text")}</span>
                </div>
              ))}
            </div>

            <div className="hidden lg:grid grid-cols-4 gap-2 pt-2">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="text-center">
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 border border-sky-300/40 hover:bg-white/25 transition-all shadow-lg">
                      <Icon className="w-4 h-4 text-sky-200 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white drop-shadow-md">{stat.value}</div>
                      <div className="text-[9px] text-sky-50">{getLocalizedProperty(stat, "label")}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="group flex items-center gap-2 bg-white text-sky-600 px-4 py-2 rounded-lg hover:bg-sky-50 transition-all shadow-lg hover:shadow-xl hover:scale-105">
              <span className="font-bold text-xs lg:text-sm">{t("discoverMore")}</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:translate-x-[-4px] transition-transform" />
            </button>
          </div>

          {/* Right Side - Donation Card */}
          <div className="lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-cyan-600 p-4 lg:p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/20 rounded-full -ml-10 -mb-10"></div>
                <Sparkles className="absolute top-3 left-3 w-4 h-4 text-sky-200" />
                <div className="relative z-10 text-center">
                  <h3 className="text-lg lg:text-xl font-extrabold mb-1 drop-shadow-md">
                    {t("monthlyCommitment")}
                  </h3>
                  <p className="text-sky-50 text-xs drop-shadow-sm">
                    {t("monthlyCommitmentDesc")}
                    <span className="font-bold"> "{t("hadithText")}"</span>
                  </p>
                </div>
              </div>

              <div className="p-4 lg:p-5 space-y-3 bg-gradient-to-b from-gray-50 to-white">
                {/* Category Selection (from API, localized) */}
                <div>
                  <label className="block text-gray-900 font-bold mb-2 text-xs">{t("selectProject")}</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-white text-gray-900 border-2 border-gray-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all cursor-pointer text-xs hover:border-sky-400 shadow-sm"
                  >
                    {categoriesLoading ? (
                      <option value="">...</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Amount Buttons */}
                <div>
                  <label className="block text-gray-900 font-bold mb-2 text-xs">{t("selectAmount")}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((amount, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAmount(amount)}
                        dir="ltr"
                        className={`p-2.5 rounded-lg font-bold text-xs transition-all shadow-sm ${
                          selectedAmount === amount
                            ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md scale-105 ring-2 ring-sky-400/50"
                            : "bg-white text-gray-800 hover:bg-sky-50 hover:text-sky-600 border-2 border-gray-300 hover:border-sky-400 hover:scale-105 hover:shadow-md"
                        }`}
                      >
                        {amount} {currencyLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-gray-900 font-bold mb-2 text-xs">{t("customAmount")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={t("enterAmount")}
                      className="w-full p-2.5 pr-10 rounded-lg bg-white text-gray-900 border-2 border-gray-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all text-xs hover:border-sky-400 shadow-sm"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-xs">{currencyLabel}</span>
                  </div>
                </div>

                {/* Donate Button - opens monthly category donation dialog */}
                <button
                  onClick={handleDonateClick}
                  disabled={!selectedCategoryId || displayAmount <= 0 || categoriesLoading}
                  className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:from-sky-600 hover:via-sky-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-sm group disabled:opacity-60 disabled:pointer-events-none"
                >
                  <span className="flex items-center justify-center gap-2">
                    {t("donateNow")}
                    <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" />
                  </span>
                </button>

                {/* Trust Badge */}
                <div className="pt-2 border-t-2 border-gray-200">
                  <div className="flex items-center justify-center gap-2 text-gray-700 text-[10px] font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    <span>{t("secureTransactions")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monthly donation dialog for selected category */}
      <DonationDialog
        isOpen={donationDialogOpen}
        onClose={() => setDonationDialogOpen(false)}
        monthlyOnly
        categoryId={selectedCategoryId}
        categoryName={selectedCategory?.name ?? ""}
        categoryImage={selectedCategory?.image ?? undefined}
        initialDonationAmount={displayAmount > 0 ? displayAmount : undefined}
      />
    </div>
  );
};

export default QuickDonate;
