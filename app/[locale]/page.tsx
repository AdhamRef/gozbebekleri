import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
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

export default function HomePage() {
  return <HomePageContent />;
}
