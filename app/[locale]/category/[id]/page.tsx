import React from "react";
import { Metadata } from "next";
import MainPage from "./_components/MainPage";
import { prisma } from "@/lib/prisma";
import { whereByIdOrLocaleSlug } from "@/lib/slug";
import { pickTranslation } from "@/lib/i18n/translation-fallback";
import {
  LOCALE_SEO,
  OG_LOCALE_MAP,
  SITE_URL,
  buildLocalizedAlternates,
} from "@/lib/seo";
import type { Locale } from "@/lib/seo";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

async function fetchCategoryForSeo(idOrSlug: string, locale: string) {
  return prisma.category.findFirst({
    where: whereByIdOrLocaleSlug(idOrSlug, locale),
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      image: true,
      translations: {
        select: { locale: true, name: true, description: true, slug: true },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const category = await fetchCategoryForSeo(id, locale);
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;

  if (!category) {
    return {
      title: seo.campaigns.title,
      description: seo.campaigns.description,
    };
  }

  const t = pickTranslation(category.translations, locale);
  const name = t?.name || category.name;
  const description =
    (t?.description || category.description || seo.campaigns.description).slice(0, 200);
  const image = category.image || `${SITE_URL}/og-image.jpg`;

  const alternates = buildLocalizedAlternates({
    basePath: "/category",
    baseSlug: category.slug,
    translations: category.translations,
    fallback: category.id,
    currentLocale: locale,
  });

  const title = `${name} | ${seo.siteName}`;

  return {
    title,
    description,
    keywords: seo.keywords,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: seo.siteName,
      locale: OG_LOCALE_MAP[locale as Locale] ?? "en_US",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { id, locale } = await params;
  return <MainPage id={id} locale={locale} />;
}
