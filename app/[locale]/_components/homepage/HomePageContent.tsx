"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Globe, MoreHorizontal, Baby, Home, Map, ArrowRight } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";

import HeroSlider, { type SlideItem } from "./HeroSlider";
import CampaignsSlider from "./CampaignsSlider";
import QuickDonate from "./QuickDonate";
import BlogCard from "../BlogCard";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { CampaignCardData } from "../CampaignCard";

// LiveDonationsTicker is a non-critical floating widget — keep it client-only
// and below-the-fold so it doesn't pull its chunk into the LCP critical path.
const LiveDonationsTicker = dynamic(() => import("@/components/LiveDonationsTicker"), {
  loading: () => null,
  ssr: false,
});

interface CategoryItem {
  id: string;
  slug?: string | null;
  name: string;
  image?: string | null;
  icon?: string | null;
  order?: number;
}

interface PostItem {
  id: string;
  slug?: string | null;
  title: string;
  description: string | null;
  image: string | null;
  published: boolean;
  createdAt: string;
}

interface HomePageContentProps {
  firstHeroImage?: string | null;
  initialSlides?: SlideItem[];
  initialCampaigns: CampaignCardData[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  initialCategories: CategoryItem[];
  initialPosts: PostItem[];
}

const STATS = [
  { icon: Home, valueKey: "stat1Value", labelKey: "stat1Label", value: "100K+" },
  { icon: Baby, valueKey: "stat2Value", labelKey: "stat2Label", value: "500K+" },
  { icon: Globe, valueKey: "stat3Value", labelKey: "stat3Label", value: "20" },
  { icon: Map, valueKey: "stat4Value", labelKey: "stat4Label", value: "4" },
];

const HomePage: React.FC<HomePageContentProps> = ({
  firstHeroImage,
  initialSlides = [],
  initialCampaigns,
  initialNextCursor,
  initialHasMore,
  initialCategories,
  initialPosts,
}) => {
  const t = useTranslations("HomePage");

  return (
    <div className="bg-white">
      {/* ── Hero Slider ── */}
      <HeroSlider initialSlides={initialSlides} initialFirstImage={firstHeroImage ?? null} />

      {/* ── Featured Campaigns Slider — fully SSR'd from server-fetched data, so the
              cards render in the initial HTML and there's nothing to shift in. */}
      <section className="bg-gray-50 pt-10 sm:pt-12 pb-5 sm:pb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-xs font-bold text-[#FA5D17] uppercase tracking-wider">{t("featuredProjects") || "ÖNE ÇIKAN PROJELER"}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{t("currentProjects") || "Güncel Projeler"}</h2>
            </div>
            <Link href="/campaigns" className="flex mb-1 items-center gap-1.5 text-sm font-semibold text-[#025EB8] hover:text-[#FA5D17] transition-colors">
              {t("viewAll") || "Tümünü Gör"} <MoreHorizontal className="w-4 h-4" />
            </Link>
          </div>
          {/* Suspense boundary required because CampaignCard descendants call useSearchParams. */}
          <Suspense fallback={null}>
            <CampaignsSlider
              initialCampaigns={initialCampaigns}
              initialNextCursor={initialNextCursor}
              initialHasMore={initialHasMore}
            />
          </Suspense>
        </div>
      </section>

      {/* ── Quick Donate — also SSR'd with the categories the server already fetched. */}
      <section
        className="relative lg:py-10 sm:py-14 overflow-hidden bg-gray-50"
        style={{
          backgroundImage: "url('/bg.webp')",
          backgroundRepeat: "repeat",
          backgroundSize: "320px",
          backgroundBlendMode: "multiply",
        }}
      >
        <div className="relative z-10 max-w-7xl mx-auto">
          <Suspense fallback={null}>
            <QuickDonate initialCategories={initialCategories} />
          </Suspense>
        </div>
      </section>

      {/* ── Statistics Banner ── */}
      <section
        className="bg-[#ff6a25] py-10 sm:py-14"
        style={{
          backgroundImage: "url('/confetti-doodles (1).svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
          backgroundBlendMode: "multiply",
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center text-white">
                <stat.icon className="w-10 h-10 mb-2" />
                <span className="text-4xl sm:text-5xl font-extrabold">{stat.value}</span>
                <span className="text-sm text-white/80 mt-1 font-medium">{t(stat.labelKey as Parameters<typeof t>[0]) || stat.labelKey}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Donation Categories ── */}
      {initialCategories.length > 0 && (
        <section
          className="bg-gray-50 py-7 border-y border-gray-100"
          style={{
            backgroundImage: "url('/bg.webp')",
            backgroundRepeat: "repeat",
            backgroundSize: "200px",
            backgroundBlendMode: "multiply",
          }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-sm font-bold text-[#FA5D17] uppercase tracking-widest">{t("weHelp") || "WE HELP"}</span>
                <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">{t("donationCategories") || "Donation Categories"}</h2>
              </div>
              <Link href="/campaigns" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#025EB8] hover:text-[#FA5D17] transition-colors">
                {t("viewAll") || "View all"} <MoreHorizontal className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {initialCategories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug || cat.id}`}
                  className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border border-gray-100 bg-white hover:bg-[#025EB8] hover:border-[#025EB8] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#025EB8]/20"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#025EB8]/8 flex items-center justify-center group-hover:bg-white/15 transition-colors">
                    <CategoryIcon name={cat.icon} className="w-5 h-5 sm:w-7 sm:h-7 text-[#025EB8] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[13px] sm:text-sm font-medium text-gray-700 group-hover:text-white text-center line-clamp-2 leading-snug transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>

            <div className="sm:hidden text-center mt-6">
              <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#025EB8]">
                {t("viewAll") || "View all"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── News / Blog ── */}
      {initialPosts.length > 0 && (
        <section className="bg-white py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-bold text-[#FA5D17] uppercase tracking-wider">{t("latestNews") || "SON HABERLER"}</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{t("news") || "Haberler"}</h2>
              </div>
              <Link href="/blog" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#025EB8] hover:text-[#FA5D17] transition-colors">
                {t("viewAll") || "Tümünü Gör"} <MoreHorizontal className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  title={post.title}
                  image={post.image || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg"}
                  link={`/blog/${post.slug || post.id}`}
                />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#025EB8]">
                {t("viewAll") || "Tümünü Gör"} <MoreHorizontal className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <LiveDonationsTicker />
    </div>
  );
};

export default HomePage;
