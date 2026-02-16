"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCurrency } from "@/hooks/useCampaignValue";
import { useCurrency } from "@/context/CurrencyContext";
import { formatNumber } from "@/hooks/formatNumber";

interface Campaign {
  id: string;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  category: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
}

const MainPage = ({ id, locale }: { id: string; locale?: string }) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { convertToCurrency } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const effectiveLocale = locale || (typeof window !== 'undefined' ? (window.location.pathname.split('/')[1] || 'ar') : 'ar');
        const [categoryRes, campaignsRes] = await Promise.all([
          axios.get(`/api/categories/${id}?locale=${effectiveLocale}&counts=true`),
          axios.get(`/api/categories/${id}/campaigns?locale=${effectiveLocale}&limit=100`),
        ]);

        setCategory(categoryRes.data);
        setCampaigns(campaignsRes.data.items || []);
        console.log(campaignsRes.data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, locale]);

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            لم يتم العثور على القسم
          </h2>
          <p className="text-gray-600 mb-8">
            {error || "القسم الذي تبحث عنه غير موجود."}
          </p>
          <Link
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div
        className="relative py-8 max-sm:py-6 flex items-center bg-gradient-to-bl from-stone-100 to-[#fafafa] sm:bg-none"
        style={{
          backgroundImage: `url(${category.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full h-full bg-black absolute opacity-60" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex items-center justify-center flex-col sm:flex-row">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-[2] text-center sm:text-start"
          >
            <h1 className="text-4xl md:text-5xl font-semibold text-white mb-6">
              تبرع لحالات{" "}
              <span className="bg-gradient-to-r rounded-lg from-sky-200 to-sky-300 text-transparent bg-clip-text leading-[1.24]">
                {category.name}{" "}
              </span>
            </h1>

            <p className="text-xl max-sm:text-sm text-white mb-8 ">
              {category.description}
            </p>

            <div className="flex gap-4 items-center justify-center sm:justify-start">
              <div className="relative flex-1 max-w-xl">
                <Input
                  type="text"
                  placeholder="ابحث عن حملة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border-0 rounded-lg text-lg placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex justify-end items-center sm:block hidden"
          >
            <img
              src={category.image || "/images/default-category.jpg"}
              alt={category.name}
              className="max-h-96 rounded-xl"
            />
          </motion.div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/campaign/${campaign.id}`}
                prefetch={true}
                className="block bg-white rounded-lg overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={campaign.images[0]}
                    alt={campaign.title}
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="p-4">
                  <div className="flex flex-col gap-2 mb-4">
                    <h3 className="text-lg font-bold text-gray-800 truncate">
                      {campaign.title}
                    </h3>
                    <p className="text-gray-600 text-sm truncate">
                      {campaign.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-700 mb-2">
                      <span>
                        <span className="font-semibold">
                          {getCurrency()}
                          {formatNumber(
                            convertToCurrency(
                              Math.round(campaign.currentAmount)
                            ).convertedValue
                          )}
                        </span>{" "}
                        تبرعات
                      </span>
                      <span>
                        تبقي{" "}
                        <span className="font-semibold">
                          {getCurrency()}
                          {formatNumber(
                            convertToCurrency(Math.round(campaign.targetAmount))
                              .convertedValue
                          )}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-emerald-100 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
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

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {searchQuery
                ? "لم يتم العثور على نتائج للبحث"
                : "لا توجد حملات في هذا القسم حالياً"}
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
    {/* Hero Section Skeleton */}
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

    {/* Campaigns Grid Skeleton */}
    <div className="max-w-7xl mx-auto px-6 py-12 max-sm:py-8">
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

export default MainPage;
