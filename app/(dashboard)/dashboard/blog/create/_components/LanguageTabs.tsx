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
    campaignId?: string | null;
    campaign_id?: string;
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
  campaignOptions?: { label: string; value: string }[];
  mode?: "create" | "edit";
}

export default function LanguageTabs({ post, categories, campaignOptions = [], mode = "edit" }: LanguageTabsProps) {
  const isCreate = mode === "create" || post.id === "new";
  const hasLocale = (code: string) =>
    post.translations?.some((t) => t.locale === code && (t.title || t.description || t.content));
  const hasEn = hasLocale("en");
  const hasFr = hasLocale("fr");
  const hasTr = hasLocale("tr");
  const hasId = hasLocale("id");
  const hasPt = hasLocale("pt");
  const hasEs = hasLocale("es");

  const localeTabs: { value: string; label: string; required?: boolean; has?: boolean }[] = [
    { value: "ar", label: "🇸🇦 العربية", required: true },
    { value: "en", label: "🇬🇧 English", has: hasEn },
    { value: "fr", label: "🇫🇷 Français", has: hasFr },
    { value: "tr", label: "🇹🇷 Türkçe", has: hasTr },
    { value: "id", label: "🇮🇩 Bahasa", has: hasId },
    { value: "pt", label: "🇵🇹 Português", has: hasPt },
    { value: "es", label: "🇪🇸 Español", has: hasEs },
  ];

  return (
    <Tabs defaultValue="ar" className="w-full">
      <TabsList className="flex flex-wrap gap-1 mb-6" dir="rtl">
        {localeTabs.map(({ value, label, required, has }) => (
          <TabsTrigger key={value} value={value} className="gap-2">
            {label}
            {required && <span className="text-xs text-red-600">*</span>}
            {has && <CheckCircle2 className="w-3 h-3 text-green-600" />}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="ar" className="mt-0">
        <BlogEditor
          post={post}
          categories={categories}
          campaignOptions={campaignOptions}
          userId={undefined}
          redirectAfterCreate={isCreate ? "/dashboard/blog/create" : undefined}
          isCreate={isCreate}
        />
      </TabsContent>

      {(["en", "fr", "tr", "id", "pt", "es"] as const).map((loc) => (
        <TabsContent key={loc} value={loc} className="mt-0">
          {isCreate ? (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">
                احفظ المقال بالعربية أولاً لتفعيل الترجمة.
              </CardContent>
            </Card>
          ) : (
            <BlogLocaleEditor post={post} locale={loc} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
