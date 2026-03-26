"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Globe,
  UserPlus,
  CheckCircle,
  Lightbulb,
  Wallet,
} from "lucide-react";
import CampaignsSlider from "./_components/homepage/CampaignsSlider";
import CampaignsDisplay from "./_components/homepage/CampaignsDisplay";
import CampaignCard from "./_components/CampaignCard";
import QuickDonate from "./_components/homepage/QuickDonate";
import HeroSlider from "./_components/homepage/HeroSlider";
import axios from "axios";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BlogCard from "./_components/BlogCard";
import LiveDonationsTicker from "@/components/LiveDonationsTicker";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

const HOME_LOGO_URL = "https://i.ibb.co/ZwcJcN1/logo.webp";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cacheGet = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, expires } = JSON.parse(raw) as { data: T; expires: number };
    if (Date.now() > expires) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const cacheSet = <T,>(key: string, data: T): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, expires: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    /* ignore */
  }
};

interface CategoryItem {
  id: string;
  name: string;
  image?: string | null;
  icon?: string | null;
  order?: number;
}

interface PostItem {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  published: boolean;
  createdAt: string;
}

function HomeLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="flex flex-col items-center gap-10">
        <div className="relative">
          <div className="absolute -inset-4 animate-pulse rounded-full bg-sky-100/60 blur-xl" />
          <img
            src={HOME_LOGO_URL}
            alt=""
            className="relative h-16 w-auto sm:h-20 object-contain animate-[fadeIn_0.5s_ease-out]"
          />
        </div>
        <div className="flex flex-col items-center gap-4 w-full max-w-[200px]">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 animate-[shimmer_1.2s_ease-in-out_infinite]"
              style={{ width: "40%" }}
            />
          </div>
          <p className="text-xs font-medium text-slate-500 tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}

const FAQ_ICONS = [
  <UserPlus key="1" className="w-6 h-6 mx-3 text-blue-500" />,
  <Wallet key="2" className="w-6 h-6 mx-3 text-green-500" />,
  <CheckCircle key="3" className="w-6 h-6 mx-3 text-purple-500" />,
  <Globe key="4" className="w-6 h-6 mx-3 text-sky-500" />,
  <Lightbulb key="5" className="w-6 h-6 mx-3 text-yellow-500" />,
];

const HomePage: React.FC = () => {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 2);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cacheKeyCategories = `home_categories_${locale}`;
    const cacheKeyPosts = `home_posts_${locale}`;

    let cancelled = false;

    const run = async () => {
      const cachedCategories = cacheGet<CategoryItem[]>(cacheKeyCategories);
      const cachedPosts = cacheGet<PostItem[]>(cacheKeyPosts);

      if (cachedCategories?.length !== undefined) {
        setCategories(cachedCategories);
      }
      if (cachedPosts?.length !== undefined) {
        setPosts(cachedPosts);
      }

      const hasValidCache = cachedCategories && cachedPosts;
      if (hasValidCache) {
        setInitialLoading(false);
      }

      const [categoriesRes, postsRes] = await Promise.all([
        fetch(`/api/categories?locale=${locale}&limit=50&sortBy=order`).then(
          (r) => r.json()
        ),
        axios.get("/api/posts", { params: { locale, limit: 3 } }).then(
          (r) => r.data
        ),
      ]);

      if (cancelled) return;

      const categoryItems =
        categoriesRes?.items ?? categoriesRes ?? [];
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
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <div className="bg-white mx-auto">
      {initialLoading && <HomeLoadingScreen />}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(150%); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
        `,
      }} />
      {/* Hero Carousel */}
      <HeroSlider />

      {/* Current Projects */}
      <section className="container mx-auto mt-2">
        <CampaignsSlider isGrid={true} isGridMobile={false} limit={8} />
      </section>

      {/* Donation Categories */}
      <section
        className="relative py-8 sm:py-10 lg:py-12 overflow-hidden"
        style={{
          backgroundImage: `url('/wavey-fingerprint.svg')`,
          backgroundRepeat: "repeat",
          backgroundColor: "rgb(248 250 252)",
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
            {t("donationCategories")}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.id}`}
                className="group flex flex-col items-center rounded-xl hover:-translate-y-0.5 p-5 sm:p-6"
              >
                <span className="text-3xl sm:text-4xl lg:text-5xl mb-2.5 sm:mb-3 leading-none" aria-hidden>
                  {cat.icon ?? "❤️"}
                </span>
                <h3 className="font-semibold text-gray-800 group-hover:text-sky-700 text-xs sm:text-sm text-center line-clamp-2 transition-colors duration-200">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About + Quick Donate */}
      <div>
        <QuickDonate />
      </div>

      <section className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-gray-800">
          {t("news")}
        </h2>
        <p className="text-center text-gray-700 mb-6 text-xs sm:text-sm">
          {t("newsSubtitle")}
        </p>
        <div className="grid sm:grid-cols-3 lg:grid-cols-3 gap-5 sm:gap-6">
          {posts.map((post) => (
            <div key={post.id}>
              <BlogCard
                title={post.title}
                image={post.image || "/placeholder.jpg"}
                link={`/blog/${post.id}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Q&A */}
      <div className="bg-white pb-8 sm:pb-10 lg:pb-12 max-w-7xl mx-auto px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* قسم الأسئلة الشائعة */}
            <div>
              <h2 className="text-2xl md:text-4xl max-sm:text-center font-bold mb-6 text-gray-800">
                {t("faq")}
              </h2>
              <Accordion type="single" collapsible>
                {[1, 2, 3, 4, 5].map((i, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-b"
                  >
                    <AccordionTrigger className="text-sm text-right hover:text-blue-600 transition">
                      <div className="flex items-center">
                        {FAQ_ICONS[index]}
                        {t(`faq${i}Question`)}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-4">
                      {t(`faq${i}Answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* قسم الصورة */}
            <div>
              <img
                src="https://i.ibb.co/Q7zfYF8J/558969696-1112724364364070-4681565038920366683-n.jpg"
                alt={t("communityImpact")}
                className="max-sm:hidden rounded-2xl shadow-2xl transform transition duration-300 w-full"
              />
            </div>
          </div>
        </div>
      </div>
      <LiveDonationsTicker />
    </div>
  );
};

export default HomePage;
