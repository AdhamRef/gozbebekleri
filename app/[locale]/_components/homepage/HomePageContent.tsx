"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { Globe, MoreHorizontal, Baby, Home, Map, ArrowRight } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";

import HeroSlider, { type SlideItem } from "./HeroSlider";
import CampaignsSlider from "./CampaignsSlider";
import QuickDonate from "./QuickDonate";
import BlogCard from "../BlogCard";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import type { CampaignCardData } from "../CampaignCard";

// LiveDonationsTicker is a non-critical floating widget — keep it client-only
// and below-the-fold so it doesn't pull its chunk into the LCP critical path.
const LiveDonationsTicker = dynamic(() => import("@/components/LiveDonationsTicker"), {
  loading: () => null,
  ssr: false,
});

/** Category tiles are small, so pull a correspondingly small Cloudinary render. */
function buildTileSrc(src: string, width: number): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(/\/upload\//, `/upload/f_auto,q_auto:eco,w_${width},c_fill,g_auto/`);
}

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
  const locale = useLocale();

  // Mirror SSR-provided data into local state. If SSR's internal fetches failed
  // (e.g. base-URL resolution mismatch, internal API timeout), we'll populate them
  // from the browser as a fallback so the homepage is never blank.
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);

  useEffect(() => {
    if (categories.length > 0) return;
    let cancelled = false;
    fetch(`/api/categories?locale=${locale}&limit=12&sortBy=order`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setCategories(items as CategoryItem[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (posts.length > 0) return;
    let cancelled = false;
    axios
      .get("/api/posts", { params: { locale, limit: 3 } })
      .then((r) => {
        if (cancelled) return;
        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        setPosts(items as PostItem[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

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
            <QuickDonate initialCategories={categories} />
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
      {categories.length > 0 && (
        <section
          className="bg-gray-50 py-5 sm:py-6 border-y border-gray-100"
          style={{
            backgroundImage: "url('/bg.webp')",
            backgroundRepeat: "repeat",
            backgroundSize: "200px",
            backgroundBlendMode: "multiply",
          }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-bold text-[#FA5D17] uppercase tracking-widest">{t("weHelp") || "WE HELP"}</span>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{t("donationCategories") || "Donation Categories"}</h2>
              </div>
              <Link href="/campaigns" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#025EB8] hover:text-[#FA5D17] transition-colors">
                {t("viewAll") || "View all"} <MoreHorizontal className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug || cat.id}`}
                  className="group relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden rounded-xl bg-[#0b3f74] shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#025EB8]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FA5D17]"
                >
                  {cat.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={buildTileSrc(cat.image, 400)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#025EB8] to-[#0b3f74]" />
                  )}

                  {/* Legibility scrim — dark at the bottom where the name sits. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5 transition-opacity duration-300 group-hover:from-[#025EB8]/90 group-hover:via-black/45" />

                  <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-2.5">
                    <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center self-start rounded-lg bg-white/20 backdrop-blur-sm ring-1 ring-white/25 transition-colors group-hover:bg-[#FA5D17] group-hover:ring-[#FA5D17]">
                      <CategoryIcon name={cat.icon} className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white" />
                    </span>
                    <span className="text-[12px] sm:text-[13px] font-bold leading-tight text-white line-clamp-2 drop-shadow-sm">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="sm:hidden text-center mt-3">
              <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#025EB8]">
                {t("viewAll") || "View all"} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── News / Blog ── */}
      {posts.length > 0 && (
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
              {posts.map((post) => (
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
