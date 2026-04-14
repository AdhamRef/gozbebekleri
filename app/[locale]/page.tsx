import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata, SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import HomePageContent from "./_components/homepage/HomePageContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildPageMetadata(locale, {
    title: seo.title,
    description: seo.description,
    path: "/",
    keywords: seo.keywords,
  });
}

async function getFirstSlideImage(locale: string): Promise<string | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    const res = await fetch(`${base}/api/slides?locale=${locale}&limit=1`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.items?.[0]?.image ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const firstHeroImage = await getFirstSlideImage(locale);
  // Preload the first slide image so the browser fetches it immediately
  // instead of waiting for client-side API call (~1,590ms delay)
  const preloadHref = firstHeroImage
    ? `/_next/image?url=${encodeURIComponent(firstHeroImage)}&w=1920&q=85`
    : null;

  return (
    <>
      {preloadHref && (
        <link rel="preload" as="image" href={preloadHref} fetchPriority="high" />
      )}
      <HomePageContent firstHeroImage={firstHeroImage} />
    </>
  );
}
