"use server";

import axios from "axios";
import Image from "next/image";
import { Metadata } from "next";
import React from "react";
// server-side messages loader

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { ar as dateAr } from "date-fns/locale";
import Link from "next/link";
import ShareButton from "./_components/ShareButton";
import BlogPostContent from "./_components/BlogPostContent";

interface BlogPostProps {
  params: Promise<{ locale: string; postId: string }>;
}

// Generate metadata for the blog post page
export async function generateMetadata(args: BlogPostProps): Promise<Metadata> {
  try {
    const { params } = await args;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://gozbebekleri.vercel.app";
    const locale = params?.locale || "ar";
    const postId = params?.postId;

    const response = await axios.get(`${baseUrl}/api/posts/${postId}`, { params: { locale } });
    const post = response.data.post;

    // Prefer localized top-level fields, then translations array, then language-suffixed fallbacks
    const tr = Array.isArray(post?.translations) ? post.translations.find((t) => t.locale === locale) : null;
    const titleText = post?.title || tr?.title || post?.titleAR || post?.titleEN || post?.titleFR || "Blog";
    const descriptionText = post?.description || tr?.description || post?.descriptionAR || post?.descriptionEN || post?.descriptionFR || "";
    // Use only top-level `post.image` for metadata images (do not prefer translation images)
    const imageUrl = post?.image || "/default-post-image.jpg";

    return {
      title: `${titleText} - قرة العيون`,
      description: descriptionText,
      openGraph: {
        title: `${titleText} - قرة العيون`,
        description: descriptionText,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: titleText,
          },
        ],
        url: `https://gozbebekleri.vercel.app/${locale}/blog/${postId}`,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: `${titleText} - قرة العيون`,
        description: descriptionText,
        images: [imageUrl],
      },
      alternates: {
        canonical: `https://gozbebekleri.vercel.app/${locale}/blog/${postId}`,
      },
    };
  } catch (err) {
    console.error("Failed to generate metadata", err);
    return { title: "Blog" };
  }
}

export default async function BlogPost({ params: paramsPromise }: BlogPostProps) {
  const params = await paramsPromise;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://gozbebekleri.vercel.app";
  const locale = params.locale || "ar";
  const msgs = await import(`../../../../i18n/messages/${locale}.json`);
  const t = (k: string) => msgs?.default?.Blog?.[k] ?? k;

  // Fetch the post and similar posts (API already returns localized fields)
  const res = await axios.get(`${baseUrl}/api/posts/${params.postId}`, { params: { locale } });
  const { post, similarPosts } = res.data;

  // Helper to pick a localized value: prefer a top-level localized field, then translations array, then post.fieldAR/EN/FR
  const pickLocalized = (obj, field) => {
    if (!obj) return "";
    if (obj[field]) return obj[field];
    if (Array.isArray(obj.translations)) {
      const tr = obj.translations.find((t) => t.locale === locale);
      if (tr && tr[field]) return tr[field];
    }
    const suffixed = obj[`${field}${locale.toUpperCase()}`];
    if (suffixed) return suffixed;
    return "";
  };

  const localizedTitle = pickLocalized(post, "title");
  const localizedDescription = pickLocalized(post, "description");
  const localizedContent = pickLocalized(post, "content");
  const categoryName = pickLocalized(post?.category, "name");

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Post not found</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-100">
      <div className="min-h-screen pt-10 pb-10 relative max-w-7xl mx-auto">
        <Progress className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent" value={0} />
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card className="overflow-hidden">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{categoryName}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: locale === 'ar' ? dateAr : undefined }) : ''}
                    </span>
                  </div>
                  <CardTitle className="text-3xl font-bold leading-tight">{localizedTitle}</CardTitle>
                </CardHeader>

                {post?.image && (
                  <div className="relative w-full aspect-video overflow-hidden">
                    <Image src={post.image} alt={localizedTitle || "Post Image"} fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover" />
                  </div>
                )}

                <CardContent className="p-6">
                  {localizedDescription && <p className="lead text-muted-foreground">{localizedDescription}</p>}
                  <Separator className="my-6" />
                  <BlogPostContent content={localizedContent} />
                </CardContent>

                <CardFooter>
                  <ShareButton label={t('sharePost')} copiedMessage={t('linkCopied')} url={`https://gozbebekleri.vercel.app/${locale}/blog/${params.postId}`} />
                </CardFooter>
              </Card>
            </div>

            <aside>
              <Card className="sticky top-[5.5rem] overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{t('similarPosts')}</CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex flex-col gap-4">
                  {(similarPosts as { id: string; title?: string; image?: string }[]).map((sp) => (
                    <Link key={sp.id} href={`/${locale}/blog/${sp.id}`} className="group relative rounded-xl overflow-hidden border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="relative aspect-[4/2.5] overflow-hidden">
                        <Image src={sp.image || ''} alt={sp.title || ''} fill sizes="600px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      </div>

                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <span className="mb-2 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{t('article')}</span>
                        <h3 className="text-sm font-bold leading-snug text-white line-clamp-3">{(sp && (sp.title || (Array.isArray(sp.translations) ? (sp.translations.find((t2) => t2.locale === locale)?.title) : undefined) || sp.titleAR || sp.titleEN || sp.titleFR))}</h3>
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
}
