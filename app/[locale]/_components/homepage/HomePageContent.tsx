"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Globe, MoreHorizontal, Baby, Home, Map, ArrowRight } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";

import CampaignsSlider from "./CampaignsSlider";
import QuickDonate from "./QuickDonate";
import HeroSlider from "./HeroSlider";
import BlogCard from "../BlogCard";

interface HomePageContentProps {
  firstHeroImage?: string | null;
}
import LiveDonationsTicker from "@/components/LiveDonationsTicker";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import axios from "axios";

const CACHE_TTL_MS = 5 * 60 * 1000;

const cacheGet = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, expires } = JSON.parse(raw) as { data: T; expires: number };
    if (Date.now() > expires) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
};

const cacheSet = <T,>(key: string, data: T): void => {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + CACHE_TTL_MS })); } catch { /* ignore */ }
};

interface CategoryItem { id: string; name: string; image?: string | null; icon?: string | null; order?: number; }
interface PostItem { id: string; title: string; description: string | null; image: string | null; published: boolean; createdAt: string; }

const LOGO_URL = "https://i.ibb.co/Y4RZj4cs/output-onlinepngtools.png";

function HomeLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Soft radial glow behind logo */}
      <div className="absolute w-72 h-72 rounded-full bg-[#025EB8]/6 blur-3xl" />
      <div className="absolute w-40 h-40 rounded-full bg-[#FA5D17]/8 blur-2xl translate-y-8" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <Image src={LOGO_URL} alt="" width={128} height={128} quality={100} className="h-16 w-auto object-contain" />

        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#025EB8] animate-bounce"
              style={{ animationDelay: `${i * 0.18}s`, animationDuration: "0.9s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { icon: Home, valueKey: "stat1Value", labelKey: "stat1Label", value: "40K+" },
  { icon: Baby, valueKey: "stat2Value", labelKey: "stat2Label", value: "35K+" },
  { icon: Globe, valueKey: "stat3Value", labelKey: "stat3Label", value: "20" },
  { icon: Map, valueKey: "stat4Value", labelKey: "stat4Label", value: "4" },
];

const HomePage: React.FC<HomePageContentProps> = ({ firstHeroImage }) => {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const cacheKeyCategories = `home_categories_${locale}`;
    const cacheKeyPosts = `home_posts_${locale}`;
    let cancelled = false;

    const run = async () => {
      const cachedCategories = cacheGet<CategoryItem[]>(cacheKeyCategories);
      const cachedPosts = cacheGet<PostItem[]>(cacheKeyPosts);
      if (cachedCategories?.length) setCategories(cachedCategories);
      if (cachedPosts?.length) setPosts(cachedPosts);
      if (cachedCategories && cachedPosts) setInitialLoading(false);

      const [categoriesRes, postsRes] = await Promise.all([
        fetch(`/api/categories?locale=${locale}&limit=50&sortBy=order`).then((r) => r.json()),
        axios.get("/api/posts", { params: { locale, limit: 3 } }).then((r) => r.data),
      ]);
      if (cancelled) return;

      const categoryItems = categoriesRes?.items ?? categoriesRes ?? [];
      const newCategories = Array.isArray(categoryItems) ? categoryItems : [];
      setCategories(newCategories);
      cacheSet(cacheKeyCategories, newCategories);

      const postItems = postsRes?.items ?? postsRes ?? [];
      const postList = Array.isArray(postItems) ? postItems : [];
      setPosts(postList);
      cacheSet(cacheKeyPosts, postList);

      setInitialLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <div className="bg-white">
      {initialLoading && <HomeLoadingScreen />}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer{0%,100%{transform:translateX(-100%)}50%{transform:translateX(150%)}}` }} />

      {/* ── Hero Slider ── */}
      <HeroSlider initialFirstImage={firstHeroImage ?? null} />

      {/* ── Featured Campaigns Slider ── */}
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
          <CampaignsSlider limit={12}/>
        </div>
      </section>

      {/* ── Quick Donate ── */}
      <section
        className="relative lg:py-10 sm:py-14 overflow-hidden bg-gray-50"
        style={{
          backgroundImage: "url('/bg.webp')",
          // backgroundImage: "url('/confetti-doodles.svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "320px",
          backgroundBlendMode: "multiply",
        }}
      >
        <div className="relative z-10 max-w-7xl mx-auto">
          <QuickDonate />
        </div>
      </section>

      {/* ── Statistics Banner ── */}
      <section className="bg-[#ff6a25] py-10 sm:py-14"        style={{
          backgroundImage: "url('/confetti-doodles (1).svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
          backgroundBlendMode: "multiply",
        }}>
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
        <section className="bg-gray-50 py-7 border-y border-gray-100"         style={{
          backgroundImage: "url('/bg.webp')",
          // backgroundImage: "url('/confetti-doodles.svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
          backgroundBlendMode: "multiply",
        }}>
          <div className="max-w-7xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-sm font-bold text-[#FA5D17] uppercase tracking-widest">{t("weHelp") || "WE HELP"}</span>
                <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">{t("donationCategories") || "Donation Categories"}</h2>
              </div>
              <Link href="/campaigns" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#025EB8] hover:text-[#FA5D17] transition-colors">
                {t("viewAll") || "View all"} <MoreHorizontal className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
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

            {/* Mobile view-all */}
            <div className="sm:hidden text-center mt-6">
              <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#025EB8]">
                {t("viewAll") || "View all"} <ArrowRight className="w-4 h-4" />
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
                  link={`/blog/${post.id}`}
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
