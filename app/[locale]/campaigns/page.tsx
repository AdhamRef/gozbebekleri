"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Search, Filter, Loader2, HandHeart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrency } from "@/hooks/useCampaignValue";
import { useCurrency } from "@/context/CurrencyContext";
import { formatNumber } from "@/hooks/formatNumber";
import { useDebounce } from "use-debounce";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";
import SignInDialog from "@/components/SignInDialog";

interface Campaign {
  id: string;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  category: {
    id?: string;
    name: string;
    icon: string;
  };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface FilterState {
  sortBy: string;
  minAmount: number;
  maxAmount: number;
}

const CampaignsPage = () => {
  const { data: session } = useSession();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { convertToCurrency } = useCurrency();
  const [filters, setFilters] = useState<FilterState>({
    sortBy: "newest",
    minAmount: 0,
    maxAmount: 100000000,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 12;

  const fetchData = async (cursorParam?: string | null) => {
    try {
      setIsLoadingMore(true);
      const [campaignsRes, categoriesRes] = await Promise.all([
        selectedCategory !== "all"
          ? axios.get(`/api/categories/${selectedCategory}/campaigns`, {
              params: {
                cursor: cursorParam,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch,
                ...filters,
              },
            })
          : axios.get("/api/campaigns", {
              params: {
                cursor: cursorParam,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch,
                ...filters,
              },
            }),
        !categories.length
          ? axios.get("/api/categories")
          : Promise.resolve({ data: categories }),
      ]);

      const newCampaigns = campaignsRes.data.items.map(
        (campaign: Campaign) => ({
          ...campaign,
          category: {
            ...campaign.category,
            id: campaign.categoryId || selectedCategory,
          },
        })
      );

      if (cursorParam) {
        setCampaigns((prev) => [...prev, ...newCampaigns]);
      } else {
        setCampaigns(newCampaigns);
      }

      setHasMore(campaignsRes.data.hasMore);
      setCursor(campaignsRes.data.nextCursor);

      if (categoriesRes.data && !categories.length) {
        setCategories(categoriesRes.data);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoadingMore(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    if(!session){
      setIsSignInOpen(true)
    }
    setCampaigns([]);
    fetchData();
  }, [filters, selectedCategory, debouncedSearch]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchData(cursor);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || campaign.categoryId === selectedCategory;

    const matchesAmount =
      campaign.targetAmount >= filters.minAmount &&
      campaign.targetAmount <= filters.maxAmount;

    return (
      matchesSearch && matchesCategory && matchesAmount && campaign.isActive
    );
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (filters.sortBy) {
      case "amount-high":
        return b.targetAmount - a.targetAmount;
      case "amount-low":
        return a.targetAmount - b.targetAmount;
      case "progress":
        return (
          b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount
        );
      default: // 'newest'
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">حدث خطأ</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <SignInDialog
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />
      <div className="relative bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
            className="w-full h-auto"
          >
            <path
              fill="#ffffff"
              fillOpacity="1"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div
          className="relative w-full"
          style={{
            backgroundImage: "url('/hero2.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Add dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-br to-black/85 from-emerald-700/85 z-10" />

          {/* Content container - increased z-index to appear above overlay */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 pt-6 pb-14 sm:py-16 lg:py-20">
            {/* Rest of your content remains the same */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 sm:mb-12"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                تصفح{" "}
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-green-400 to-emerald-300 text-transparent bg-clip-text">
                    الحملات
                  </span>
                  {/* <svg className="absolute -bottom-0 left-0 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,10 Q50,20 100,10 L100,20 L0,20 Z" fill="rgba(16, 185, 129, 0.2)"/>
              </svg> */}
                </span>
              </h1>
              <p className="text-base sm:text-xl text-stone-100 max-w-2xl mx-auto px-4">
                اكتشف الحملات الخيرية وساهم في دعم المحتاجين
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 items-center max-w-2xl mx-auto"
            >
              <div className="relative flex-1 w-full sm:w-auto group">
                <div className="absolute inset-0 bg-emerald-200/30 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                <Input
                  type="text"
                  placeholder="ابحث عن حملة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm rounded-lg text-lg placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 shadow-sm border transition-all duration-300"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative hover:bg-emerald-50 transition-colors duration-300"
                  >
                    <Filter className="h-5 w-5" />
                    {Object.values(filters).some(
                      (value) =>
                        value !== false &&
                        value !== "newest" &&
                        value !== 0 &&
                        value !== 100000000
                    ) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full"
                      />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>خيارات التصفية</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">ترتيب حسب</h3>
                      <select
                        value={filters.sortBy}
                        onChange={(e) =>
                          handleFilterChange("sortBy", e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 p-2"
                      >
                        <option value="newest">الأحدث</option>
                        <option value="amount-high">المبلغ (الأعلى)</option>
                        <option value="amount-low">المبلغ (الأقل)</option>
                        <option value="progress">نسبة الإنجاز</option>
                      </select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-3">
                        نطاق المبلغ المستهدف
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">
                            الحد الأدنى ($)
                          </label>
                          <input
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) =>
                              handleFilterChange(
                                "minAmount",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-md border border-gray-300 p-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">
                            الحد الأقصى ($)
                          </label>
                          <input
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) =>
                              handleFilterChange(
                                "maxAmount",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-md border border-gray-300 p-2"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        setFilters({
                          sortBy: "newest",
                          minAmount: 0,
                          maxAmount: 100000000,
                        })
                      }
                    >
                      إعادة تعيين التصفية
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 max-sm:mt-5 sm:border-b border-gray-200/50 flex flex-wrap"
            >
              <Tabs
                defaultValue="all"
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                dir="rtl"
                className="w-full flex justify-center items-center flex-wrap"
              >
                <TabsList className="h-16 bg-transparent w-full flex flex-wrap gap-2">
                  <TabsTrigger
                    value="all"
                    className="flex w-max items-center gap-2 text-stone-100 data-[state=active]:bg-emerald-400/35 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white transition-all duration-300"
                  >
                    <HandHeart className="w-4 h-4 text-emerald-600" /> كل
                    الحملات
                  </TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="flex w-max items-center gap-2 text-stone-100 data-[state=active]:bg-emerald-400/35 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white transition-all duration-300"
                    >
                      <span
                        className="w-4 h-4"
                        dangerouslySetInnerHTML={{ __html: category.icon }}
                      />
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.1, 1) }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Link
                href={`/campaign/${campaign.id}`}
                className="block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                  <img
                    src={campaign.images[0]}
                    alt={campaign.title}
                    className="w-full h-60 object-cover transform group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <div className="flex items-center gap-2 text-white text-sm">
                      <span
                        className="w-4 h-4"
                        dangerouslySetInnerHTML={{
                          __html: campaign.category.icon,
                        }}
                      />
                      {campaign.category.name}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col p-4 pt-0">
                  <div className="flex flex-col gap-[2px] pt-4 pb-2">
                    <h3 className="text-[17px] font-bold text-stone-800 line-clamp-1 text-center mb-1">
                      {campaign.title}
                    </h3>
                    <h3 className="text-[14px] text-gray-500 line-clamp-2">
                      {campaign.description}
                    </h3>
                  </div>
                  <div className="h-[1px] bg-black/10 w-full mb-2" />
                  <div>
                    <div className="flex justify-between text-sm text-gray-700 mb-2">
                      <span>
                        <span className="font-semibold">
                          {getCurrency()}{" "}
                          {formatNumber(
                            convertToCurrency(
                              Math.round(campaign.currentAmount)
                            ).convertedValue
                          )}
                        </span>{" "}
                        تبرعات
                      </span>
                      <span>
                        تبقى{" "}
                        <span className="font-semibold">
                          {getCurrency()}{" "}
                          {formatNumber(
                            convertToCurrency(Math.round(campaign.targetAmount))
                              .convertedValue
                          )}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-emerald-500 h-3 rounded-full"
                        style={{
                          width: `${Math.min(
                            (campaign.currentAmount / campaign.targetAmount) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {hasMore && !isLoadingMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-12"
          >
            <Button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="bg-emerald-600 hover:bg-emerald-700 px-8 py-6 rounded-xl transform hover:scale-105 transition-all duration-300"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التحميل...
                </span>
              ) : (
                "تحميل المزيد"
              )}
            </Button>
          </motion.div>
        )}

        {isLoadingMore && (
          <div className="text-center mt-8">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
          </div>
        )}

        {sortedCampaigns.length === 0 && !loading && !isLoadingMore && (
          <div className="text-center py-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {searchQuery
                ? "لم يتم العثور على نتائج للبحث"
                : "لا توجد حملات متاحة حالياً"}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? "جرب استخدام كلمات بحث مختلفة"
                : "يمكنك العودة لاحقاً لمشاهدة الحملات الجديدة"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#fafafa]">
    <div className="relative h-[500px] bg-gray-200 animate-pulse">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex items-center">
        <div className="max-w-3xl space-y-6">
          <div className="h-16 bg-gray-300 rounded-lg w-2/3" />
          <div className="h-20 bg-gray-300 rounded-lg w-full" />
          <div className="h-12 bg-gray-300 rounded-lg w-96" />
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="w-full h-48 bg-gray-200 animate-pulse" />
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="h-2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CampaignsPage;
