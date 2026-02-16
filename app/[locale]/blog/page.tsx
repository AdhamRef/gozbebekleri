"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Search, Filter, Loader2, BookOpen, Calendar, Clock } from "lucide-react";
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
import { useDebounce } from "use-debounce";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  content?: string;
  createdAt: string | Date;
  category?: {
    id?: string;
    name?: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  postCount?: number;
}

interface FilterState {
  sortBy: string;
}

const BlogPage = () => {
  const t = useTranslations("Blog");
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all");
  const [filters, setFilters] = useState<FilterState>({
    sortBy: "newest",
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 12;

  const locale = useLocale() as "ar" | "en" | "fr";

  const fetchData = async (cursorParam?: string | null) => {
    try {
      setIsLoadingMore(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      const [postsRes, categoriesRes] = await Promise.all([
        selectedCategory !== "all"
          ? axios.get(`${baseUrl}/api/posts`, {
              params: {
                cursor: cursorParam,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch,
                locale,
                categoryId: selectedCategory,
                ...filters,
              },
            })
          : axios.get(`${baseUrl}/api/posts`, {
              params: {
                cursor: cursorParam,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch,
                locale,
                ...filters,
              },
            }),
        !categories.length
          ? axios.get(`${baseUrl}/api/post-categories`, { 
              params: { locale, limit: 100 } 
            })
          : Promise.resolve({ data: { categories: categories } }),
      ]);

      const postsItems = postsRes.data.items || postsRes.data.posts || [];

      if (cursorParam) {
        setPosts((prev) => [...prev, ...postsItems]);
      } else {
        setPosts(postsItems);
      }

      setHasMore(Boolean(postsRes.data.hasMore));
      setCursor(postsRes.data.nextCursor || null);

      const catData = categoriesRes.data.items || categoriesRes.data;
      if (catData && !categories.length) {
        setCategories(catData as Category[]);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoadingMore(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    setPosts([]);
    fetchData();
  }, [filters, selectedCategory, debouncedSearch, locale]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchData(cursor);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || post.category?.id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (filters.sortBy) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      default: // 'newest'
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: locale === "ar" ? ar : undefined,
    });
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {t("error") || "حدث خطأ"}
          </h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {t("retry") || "إعادة المحاولة"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50">
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
          <div className="absolute inset-0 bg-gradient-to-br to-black/85 from-blue-700/85 z-10" />

          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 pt-6 pb-14 sm:py-16 lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 sm:mb-12"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                {t("blog") || "مدونة"}{" "}
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
                    {t("ourBlog") || "المقالات"}
                  </span>
                </span>
              </h1>
              <p className="text-base sm:text-xl text-stone-100 max-w-2xl mx-auto px-4">
                {t("blogDescription") || "اكتشف أحدث المقالات والقصص الملهمة"}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 items-center max-w-2xl mx-auto"
            >
              <div className="relative flex-1 w-full sm:w-auto group">
                <div className="absolute inset-0 bg-blue-200/30 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                <Input
                  type="text"
                  placeholder={t("searchPlaceholder") || "ابحث عن مقال..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm rounded-lg text-lg placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 shadow-sm border transition-all duration-300"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative hover:bg-blue-50 transition-colors duration-300"
                  >
                    <Filter className="h-5 w-5" />
                    {filters.sortBy !== "newest" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"
                      />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{t("filterOptions") || "خيارات التصفية"}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">
                        {t("sortBy") || "ترتيب حسب"}
                      </h3>
                      <select
                        value={filters.sortBy}
                        onChange={(e) =>
                          handleFilterChange("sortBy", e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 p-2"
                      >
                        <option value="newest">{t("newest") || "الأحدث"}</option>
                        <option value="oldest">{t("oldest") || "الأقدم"}</option>
                      </select>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        setFilters({
                          sortBy: "newest",
                        })
                      }
                    >
                      {t("resetFilter") || "إعادة تعيين التصفية"}
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
                value={selectedCategory || "all"}
                onValueChange={setSelectedCategory}
                dir="rtl"
                className="w-full flex justify-center items-center flex-wrap"
              >
                <TabsList className="h-16 bg-transparent w-full flex flex-wrap gap-2">
                  <TabsTrigger
                    value="all"
                    className="flex w-max items-center gap-2 text-stone-100 data-[state=active]:bg-blue-400/35 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white transition-all duration-300"
                  >
                    <BookOpen className="w-4 h-4 text-blue-600" /> 
                    {t("allPosts") || "كل المقالات"}
                  </TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="flex w-max items-center gap-2 text-stone-100 data-[state=active]:bg-blue-400/35 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white transition-all duration-300"
                    >
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
          {sortedPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.1, 1) }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Link
                href={`/blog/${post.id}`}
                className="block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-60 object-cover transform group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-60 bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/50" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col p-4 pt-0">
                  <div className="flex flex-col gap-[2px] pt-4 pb-2">
                    {post.category?.name && (
                      <div className="mb-2">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {post.category.name}
                        </span>
                      </div>
                    )}
                    <h3 className="text-[17px] font-bold text-stone-800 line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                    {post.description && (
                      <p className="text-[14px] text-gray-500 line-clamp-3">
                        {post.description}
                      </p>
                    )}
                  </div>
                  <div className="h-[1px] bg-black/10 w-full mt-3 mb-3" />
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{t("readMore") || "اقرأ المزيد"}</span>
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
              className="bg-blue-600 hover:bg-blue-700 px-8 py-6 rounded-xl transform hover:scale-105 transition-all duration-300"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("loading") || "جاري التحميل..."}
                </span>
              ) : (
                t("loadMore") || "تحميل المزيد"
              )}
            </Button>
          </motion.div>
        )}

        {isLoadingMore && (
          <div className="text-center mt-8">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          </div>
        )}

        {sortedPosts.length === 0 && !loading && !isLoadingMore && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {searchQuery
                ? t("noResults") || "لم يتم العثور على نتائج للبحث"
                : t("noPosts") || "لا توجد مقالات متاحة حالياً"}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? t("tryDifferentSearch") || "جرب استخدام كلمات بحث مختلفة"
                : t("checkBackLater") || "يمكنك العودة لاحقاً لمشاهدة المقالات الجديدة"}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="w-full h-60 bg-gray-200 animate-pulse" />
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

export default BlogPage;