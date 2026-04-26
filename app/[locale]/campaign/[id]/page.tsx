import { Metadata } from "next";
import MainPageDummy from "../_components/MainPageDummy";
import { SITE_URL, LOCALE_SEO, OG_LOCALE_MAP, LOCALES, buildHreflang } from "@/lib/seo";
import type { Locale } from "@/lib/seo";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

interface Campaign {
  slug?: string | null;
  title: string;
  description: string;
  images: string[];
}

async function fetchCampaign(id: string, locale: string): Promise<Campaign | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://gozbebekleri.com";
    const res = await fetch(`${baseUrl}/api/campaigns/${id}?locale=${locale}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const campaign = await fetchCampaign(id, locale);
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;

  if (!campaign) {
    return {
      title: seo.campaigns.title,
      description: seo.campaigns.description,
    };
  }

  const image = campaign.images[0] || `${SITE_URL}/og-image.jpg`;
  const path = `/campaign/${campaign.slug || id}`;
  const alternates = buildHreflang(path, locale);

  // Emotionally charged, urgency-driven title
  const urgencyPrefixes: Record<string, string> = {
    ar: "ساعد الآن — ",
    en: "Urgent: ",
    tr: "Acil: ",
    fr: "Urgent : ",
    es: "Urgente: ",
    pt: "Urgente: ",
    id: "Mendesak: ",
  };
  const prefix = urgencyPrefixes[locale] ?? "";
  const title = `${prefix}${campaign.title} | ${seo.siteName}`;

  return {
    title,
    description: campaign.description.slice(0, 160),
    keywords: seo.keywords,
    alternates,
    openGraph: {
      title,
      description: campaign.description.slice(0, 200),
      url: alternates.canonical,
      siteName: seo.siteName,
      locale: OG_LOCALE_MAP[locale as Locale] ?? "en_US",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: campaign.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: campaign.description.slice(0, 200),
      images: [image],
    },
  };
}

export default async function CampaignPage({ params }: Props) {
  const { id, locale } = await params;
  return <MainPageDummy id={id} locale={locale} />;
}