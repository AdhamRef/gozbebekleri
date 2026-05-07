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

/**
 * Build a Cloudinary-hosted, format-negotiated, mobile-first hero URL at the given width.
 * Cloudinary serves AVIF/WebP automatically via f_auto and aggressive compression via q_auto:eco.
 */
function buildHeroSrc(src: string, width: number): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(
    /\/upload\//,
    `/upload/f_auto,q_auto:eco,w_${width},c_limit/`
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const firstHeroImage = await getFirstSlideImage(locale);

  // Preload the LCP image with a srcset that matches what the browser will actually request.
  // Cloudinary URLs are used directly (not the /_next/image proxy) so the preload fires immediately
  // without waiting for the Next.js image optimizer round-trip.
  const preloadSrcSet = firstHeroImage
    ? [
        `${buildHeroSrc(firstHeroImage, 640)} 640w`,
        `${buildHeroSrc(firstHeroImage, 1024)} 1024w`,
        `${buildHeroSrc(firstHeroImage, 1536)} 1536w`,
      ].join(", ")
    : null;

  return (
    <>
      {preloadSrcSet && firstHeroImage && (
        <link
          rel="preload"
          as="image"
          imageSrcSet={preloadSrcSet}
          imageSizes="100vw"
          fetchPriority="high"
        />
      )}
      <HomePageContent firstHeroImage={firstHeroImage} />
    </>
  );
}
