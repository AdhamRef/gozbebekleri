"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BlogEditor from "@/app/[locale]/blog/_components/BlogEditor";
import BlogLocaleEditor from "./BlogLocaleEditor";

interface LanguageTabsProps {
  post: {
    id: string;
    title?: string | null;
    description?: string | null;
    content?: string | null;
    image?: string | null;
    categoryId?: string | null;
    category_id?: string;
    category?: { id: string; name: string } | null;
    translations?: Array<{
      locale: string;
      title?: string | null;
      description?: string | null;
      content?: string | null;
      image?: string | null;
    }>;
    titleAR?: string;
    titleEN?: string;
    titleFR?: string;
    descriptionAR?: string;
    descriptionEN?: string;
    descriptionFR?: string;
    contentAR?: string | null;
    contentEN?: string | null;
    contentFR?: string | null;
    imageAR?: string;
    imageEN?: string;
    imageFR?: string;
  };
  categories: { label: string; value: string }[];
  mode?: "create" | "edit";
}

export default function LanguageTabs({ post, categories, mode = "edit" }: LanguageTabsProps) {
  const isCreate = mode === "create" || post.id === "new";
  const hasEn = post.translations?.some(
    (t) => t.locale === "en" && (t.title || t.description || t.content)
  );
  const hasFr = post.translations?.some(
    (t) => t.locale === "fr" && (t.title || t.description || t.content)
  );

  return (
    <Tabs defaultValue="ar" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6" dir="rtl">
        <TabsTrigger value="ar" className="gap-2">
          🇸🇦 العربية
          <span className="text-xs text-red-600">*</span>
        </TabsTrigger>
        <TabsTrigger value="en" className="gap-2">
          🇬🇧 English
          {hasEn && <CheckCircle2 className="w-3 h-3 text-green-600" />}
        </TabsTrigger>
        <TabsTrigger value="fr" className="gap-2">
          🇫🇷 Français
          {hasFr && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ar" className="mt-0">
        <BlogEditor
          post={post}
          categories={categories}
          userId={undefined}
          redirectAfterCreate={isCreate ? "/dashboard/blog/create" : undefined}
          isCreate={isCreate}
        />
      </TabsContent>

      <TabsContent value="en" className="mt-0">
        {isCreate ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center text-muted-foreground">
              احفظ المقال بالعربية أولاً لتفعيل الترجمة الإنجليزية.
            </CardContent>
          </Card>
        ) : (
          <BlogLocaleEditor post={post} locale="en" />
        )}
      </TabsContent>

      <TabsContent value="fr" className="mt-0">
        {isCreate ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center text-muted-foreground">
              احفظ المقال بالعربية أولاً لتفعيل الترجمة الفرنسية.
            </CardContent>
          </Card>
        ) : (
          <BlogLocaleEditor post={post} locale="fr" />
        )}
      </TabsContent>
    </Tabs>
  );
}
