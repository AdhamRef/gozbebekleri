"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useLocale } from "next-intl";
import { toast } from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Share2, ChevronUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Dummy Data with HTML content */
/* ------------------------------------------------------------------ */

const dummyPost = {
  id: "1",
  title: "كيف تُحدث التبرعات الصغيرة فرقًا حقيقيًا",
  description:
    "التبرعات الصغيرة ليست بلا قيمة، بل قد تكون حجر الأساس لمشاريع خيرية عظيمة.",
  image:
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600",
  // Raw HTML content
  content: `
    <h2>مقدمة</h2>
    <p>التبرعات الصغيرة لها أثر كبير إذا تم تنظيمها بشكل جيد.</p>
    <h3>لماذا تهم؟</h3>
    <ul>
      <li>تساعد في دعم المشاريع المحلية.</li>
      <li>تشجع الآخرين على المشاركة.</li>
      <li>تبني مجتمعًا أكثر تلاحمًا.</li>
    </ul>
    <p>يمكنك البدء بالتبرع بمبلغ بسيط اليوم!</p>
    <img src="https://gozbebekleri.org/uploads/4FLefMYaeSyqaKK2N1Hb_1744967602314.jpg" alt="Charity Image" />
    <p style="color: red; font-weight: bold;">تأكد من اختيار جمعية موثوقة.</p>
  `,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  category: {
    name: "العمل الخيري",
  },
};

const dummySimilarPosts = [
  {
    id: "2",
    title: "لماذا الاستمرارية أهم من حجم التبرع؟",
    image:
      "https://gozbebekleri.org/uploads/suriyenin-kuzeyindeki-depremden-etkilenenlere-destegimiz_2081.jpg",
  },
  {
    id: "3",
    title: "كيف تختار الجمعية الموثوقة للتبرع؟",
    image:
      "https://gozbebekleri.org/uploads/insanligin-etkileyicileri-konferansi_2084.jpg",
  },
];

/* ------------------------------------------------------------------ */

const MainPage = () => {
  const locale = useLocale();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  /* Scroll tracking */
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      const progress = ((window.scrollY) / totalHeight) * 100;
      setScrollProgress(progress);
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Scroll to top */
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  /* Share */
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: dummyPost.title,
        text: dummyPost.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(locale === "ar" ? "تم نسخ الرابط" : "Link copied");
    }
  };

  return (
    <div className="w-full bg-gray-100">
      <div className="min-h-screen pt-24 pb-10 relative max-w-7xl mx-auto">

        {/* Scroll Progress */}
        <Progress
          value={scrollProgress}
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent"
        />

        {/* Scroll To Top */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-4 right-4 z-50 rounded-full p-2 shadow-lg"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        )}

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Main Post */}
            <div className="md:col-span-2">
              <Card className="overflow-hidden">

                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {dummyPost.category.name}
                    </Badge>

                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(dummyPost.createdAt, {
                        addSuffix: true,
                        locale: locale === "ar" ? ar : undefined,
                      })}
                    </span>
                  </div>

                  <CardTitle className="text-3xl font-bold leading-tight">
                    {dummyPost.title}
                  </CardTitle>
                </CardHeader>

                {/* Main Image */}
                <div className="relative w-full aspect-video overflow-hidden">
                  <Image
                    src={dummyPost.image}
                    alt={dummyPost.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="object-cover"
                  />
                </div>

                <CardContent className="prose max-w-none p-6">
                  <p className="">{dummyPost.description}</p>
                  <Separator className="my-6" />

                  {/* Render raw HTML dangerously */}
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: dummyPost.content }}
                  />
                </CardContent>

                <CardFooter>
                  <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="mx-2 h-4 w-4" />
                    {locale === "ar" ? "شارك المقال" : "Share Post"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Similar Posts */}
            <aside>
              <Card className="sticky top-[5.5rem] overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">
                    {locale === "ar" ? "مقالات مشابهة" : "Similar Posts"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex flex-col gap-4">
                  {dummySimilarPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.id}`}>
                      <div className="group relative rounded-xl overflow-hidden border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">

                        <div className="relative aspect-[4/2.5] overflow-hidden">
                          <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            sizes="600px"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        </div>

                        <div className="absolute inset-0 flex flex-col justify-end p-4">
                          <span className="mb-2 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                            {locale === "ar" ? "مقال" : "Article"}
                          </span>

                          <h3 className="text-sm font-bold leading-snug text-white line-clamp-3">
                            {post.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </aside>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
