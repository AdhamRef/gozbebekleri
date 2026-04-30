import { Metadata } from "next";
import MainPageDummy from "../_components/MainPageDummy";
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

async function fetchCampaignForSeo(idOrSlug: string, locale: string) {
  return prisma.campaign.findFirst({
    where: whereByIdOrLocaleSlug(idOrSlug, locale),
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      images: true,
      translations: {
        select: { locale: true, title: true, description: true, slug: true },
      },
    },
  });
}

const URGENCY_PREFIX: Record<string, string> = {
  ar: "ساعد الآن — ",
  en: "Urgent: ",
  tr: "Acil: ",
  fr: "Urgent : ",
  es: "Urgente: ",
  pt: "Urgente: ",
  id: "Mendesak: ",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const campaign = await fetchCampaignForSeo(id, locale);
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;

  if (!campaign) {
    return {
      title: seo.campaigns.title,
      description: seo.campaigns.description,
    };
  }

  const t = pickTranslation(campaign.translations, locale);
  const title = t?.title || campaign.title;
  const description = (t?.description || campaign.description).slice(0, 160);
  const image = campaign.images[0] || `${SITE_URL}/og-image.jpg`;

  const alternates = buildLocalizedAlternates({
    basePath: "/campaign",
    baseSlug: campaign.slug,
    translations: campaign.translations,
    fallback: campaign.id,
    currentLocale: locale,
  });

  const prefix = URGENCY_PREFIX[locale] ?? "";
  const fullTitle = `${prefix}${title} | ${seo.siteName}`;

  return {
    title: fullTitle,
    description,
    keywords: seo.keywords,
    alternates,
    openGraph: {
      title: fullTitle,
      description: (t?.description || campaign.description).slice(0, 200),
      url: alternates.canonical,
      siteName: seo.siteName,
      locale: OG_LOCALE_MAP[locale as Locale] ?? "en_US",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: (t?.description || campaign.description).slice(0, 200),
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

export default async function CampaignPage({ params }: Props) {
  const { id, locale } = await params;
  return <MainPageDummy id={id} locale={locale} />;
}
