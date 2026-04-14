"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { Search, HandHeart, ArrowRight, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import { useDebounce } from "use-debounce";
import { useSession } from "next-auth/react";
import SignInDialog from "@/components/SignInDialog";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import CategoryIcon from "@/components/CategoryIcon";

interface Campaign {
  id: string;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  progress?: number;
  showProgress?: boolean;
  fundraisingMode?: string;
  isActive?: boolean;
  categoryId?: string;
  category: { id?: string; name: string; icon?: string };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  campaignCount?: number;
}

interface FilterState {
  sortBy: string;
  minAmount: number;
  maxAmount: number;
}

const HERO_IMAGE = "https://i.ibb.co/Xm58ssT/481207566-944951421141366-1158434782285969951-n-1.png";

const CampaignsPage = () => {
  const t = useTranslations("CampaignsPage");
  const { data: session } = useSession();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filters, setFilters] = useState<FilterState>({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 12;
  const locale = useLocale() as string;
  const isRTL = locale === "ar";

  const fetchData = async (cursorParam?: string | null) => {
    try {
      setIsLoadingMore(true);
      const [campaignsRes, categoriesRes] = await Promise.all([
        selectedCategory !== "all"
          ? axios.get(`/api/categories/${selectedCategory}/campaigns`, {
              params: { cursor: cursorParam, limit: ITEMS_PER_PAGE, search: debouncedSearch, locale, ...filters },
            })
          : axios.get("/api/campaigns", {
              params: { cursor: cursorParam, limit: ITEMS_PER_PAGE, search: debouncedSearch, locale, ...filters },
            }),
        !categories.length
          ? axios.get("/api/categories", { params: { locale, counts: true, limit: 100 } })
          : Promise.resolve({ data: { items: categories } }),
      ]);
      const campaignsItems = campaignsRes.data.items || campaignsRes.data;
      const newCampaigns = (campaignsItems as Campaign[]).map((campaign) => ({
        ...campaign,
        // Ensure categoryId is always set so the local filter works correctly
        categoryId: campaign.categoryId || campaign.category?.id || (selectedCategory !== "all" ? selectedCategory : undefined),
        category: { ...campaign.category, id: campaign.category?.id || campaign.categoryId || (selectedCategory !== "all" ? selectedCategory : "") },
      }));
      if (cursorParam) {
        setCampaigns((prev) => [...prev, ...newCampaigns]);
      } else {
        setCampaigns(newCampaigns);
      }
      setHasMore(Boolean(campaignsRes.data.hasMore));
      setCursor(campaignsRes.data.nextCursor || null);
      const catData = categoriesRes.data.items || categoriesRes.data;
      if (catData && !categories.length) setCategories(catData as Category[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoadingMore(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    if (!session) setIsSignInOpen(true);
    setCampaigns([]);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedCategory, debouncedSearch]);

  const loadMore = () => { if (!isLoadingMore && hasMore) fetchData(cursor); };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || c.categoryId === selectedCategory;
    const matchesAmount = c.targetAmount >= filters.minAmount && c.targetAmount <= filters.maxAmount;
    return matchesSearch && matchesCategory && matchesAmount && c.isActive;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (filters.sortBy) {
      case "amount-high": return b.targetAmount - a.targetAmount;
      case "amount-low": return a.targetAmount - b.targetAmount;
      case "progress": return (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount);
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleFilterChange = (key: keyof FilterState, value: number | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = filters.sortBy !== "newest" || filters.minAmount !== 0 || filters.maxAmount !== 100000000;

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100 max-w-sm mx-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">{t("errorTitle") || "Something went wrong"}</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#025EB8] hover:bg-[#014fa0] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <SignInDialog isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />

      {/* ── Hero Header ── */}
      <section className="relative">
        {/* Background layers — clipped independently so the search bar can overflow the section */}
        <div className="absolute inset-0">
          <Image src={HERO_IMAGE} alt="" aria-hidden fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
          <div className="absolute inset-0 bg-[#025EB8]/30" />
          <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-white/60 text-xs mb-6">
            <Link href="/" className="hover:text-white transition-colors">{t("home") || "Home"}</Link>
            <ChevronRight className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
            <span className="text-white/90 font-medium">{t("campaigns") || "Campaigns"}</span>
          </div>

          {/* Title */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 mb-4">
              <HandHeart className="w-3.5 h-3.5 text-[#FA5D17]" />
              <span>{t("projects") || "OUR PROJECTS"}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">
              {t("browse") || "Browse"}{" "}
              <span className="text-[#FA5D17]">{t("allCampaigns") || "All Campaigns"}</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-base leading-relaxed">
              {t("heroDescription") || "Support meaningful causes and make a lasting difference in people's lives."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Search bar — floats between hero and tabs ── */}
      <div className="relative z-30 max-w-2xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input
              type="text"
              placeholder={t("searchPlaceholder") || "Search campaigns..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} py-2.5 rounded-xl text-sm text-gray-800 bg-gray-50 outline-none focus:bg-white transition-colors`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-3" : "right-3"} text-gray-400 hover:text-gray-600`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
              <Sheet>
                <SheetTrigger asChild>
                  <button className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 ${hasActiveFilters ? "bg-[#FA5D17] text-white" : "bg-[#025EB8] hover:bg-[#014fa0] text-white"}`}>
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("filter") || "Filter"}</span>
                    {hasActiveFilters && (
                      <span className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-white text-[#FA5D17] text-[10px] font-bold flex items-center justify-center">!</span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent dir={isRTL ? "rtl" : "ltr"} className="w-full sm:max-w-sm">
                  <SheetHeader className="pb-4 border-b border-gray-100">
                    <SheetTitle className="flex items-center gap-2 text-start">
                      <SlidersHorizontal className="w-4 h-4 text-[#025EB8]" />
                      {t("filterOptions") || "Filter Options"}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("sortBy") || "Sort By"}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "newest", label: t("newest") || "Newest" },
                          { value: "amount-high", label: t("amountHigh") || "Highest Goal" },
                          { value: "amount-low", label: t("amountLow") || "Lowest Goal" },
                          { value: "progress", label: t("progress") || "Progress" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleFilterChange("sortBy", opt.value)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${filters.sortBy === opt.value ? "bg-[#025EB8] text-white border-[#025EB8]" : "bg-white text-gray-600 border-gray-200 hover:border-[#025EB8]/50"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("targetAmountRange") || "Target Amount"}</h3>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">{t("minAmount") || "Min"}</label>
                          <input
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) => handleFilterChange("minAmount", Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">{t("maxAmount") || "Max"}</label>
                          <input
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) => handleFilterChange("maxAmount", Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025EB8] focus:ring-2 focus:ring-[#025EB8]/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFilters({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 })}
                      className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {t("resetFilters") || "Reset Filters"}
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="bg-gray-50 border-b border-gray-100 shadow-sm sticky top-16 lg:top-[104px] z-20">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
                selectedCategory === "all"
                  ? "bg-[#025EB8] text-white border-[#025EB8] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#025EB8]/50 hover:text-[#025EB8]"
              }`}
            >
              <HandHeart className="w-3.5 h-3.5" />
              {t("allCampaigns") || "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                dir={isRTL ? "rtl" : "ltr"}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
                  selectedCategory === cat.id
                    ? "bg-[#025EB8] text-white border-[#025EB8] shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#025EB8]/50 hover:text-[#025EB8]"
                }`}
              >
                {cat.campaignCount != null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {cat.campaignCount}
                  </span>
                )}
                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campaign Grid ── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        {/* Results count */}
        {!loading && sortedCampaigns.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{sortedCampaigns.length}</span>{" "}
              {t("resultsFound") || "campaigns found"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 })}
                className="flex items-center gap-1 text-xs text-[#FA5D17] font-semibold hover:underline"
              >
                <X className="w-3 h-3" /> {t("clearFilters") || "Clear filters"}
              </button>
            )}
          </div>
        )}

        {sortedCampaigns.length === 0 && !isLoadingMore ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <HandHeart className="w-9 h-9 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">
              {searchQuery ? t("noResults") : t("noCampaigns")}
            </h3>
            <p className="text-gray-400 text-sm">
              {searchQuery ? t("tryDifferentSearch") : t("checkBackLater")}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-[#025EB8] text-sm font-semibold hover:underline"
              >
                {t("clearSearch") || "Clear search"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
            {/* Inline loading more skeletons */}
            {isLoadingMore && Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={`more-${i}`} />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !isLoadingMore && sortedCampaigns.length > 0 && (
          <div className="text-center mt-12">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 bg-[#025EB8] hover:bg-[#014fa0] text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              {t("loadMore") || "Load More"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoadingMore && sortedCampaigns.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}
      </section>
    </main>
  );
};

/* ── Skeleton card ── */
const CardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    <div className="relative h-52 bg-gray-100 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.4s_infinite] -translate-x-full" />
    </div>
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
      <div className="h-2 bg-gray-100 rounded-full animate-pulse mt-2" />
      <div className="flex justify-between pt-1">
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-9 bg-gray-100 rounded-lg animate-pulse mt-1" />
    </div>
  </div>
);

/* ── Full page loading skeleton ── */
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Hero skeleton */}
    <div className="relative h-64 bg-[#025EB8] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.8s_infinite] -translate-x-full" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="h-3 w-28 bg-white/20 rounded-full animate-pulse" />
        <div className="h-8 w-64 bg-white/20 rounded-xl animate-pulse" />
        <div className="h-3 w-48 bg-white/15 rounded animate-pulse" />
        <div className="h-11 w-full max-w-lg bg-white/20 rounded-2xl animate-pulse mt-4" />
      </div>
    </div>
    {/* Tabs skeleton */}
    <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
      ))}
    </div>
    {/* Grid skeleton */}
    <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  </div>
);

export default CampaignsPage;
