import type { Metadata } from "next";
import { LOCALE_SEO, OG_LOCALE_MAP, OG_IMAGE, SITE_URL, buildHreflang } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import { CurrencyFromUrlSync } from "@/components/CurrencyFromUrlSync";
import IntlProviderClient from "./IntlProviderClient";
import ar from "../../i18n/messages/ar.json";
import en from "../../i18n/messages/en.json";
import fr from "../../i18n/messages/fr.json";
import tr from "../../i18n/messages/tr.json";
import id from "../../i18n/messages/id.json";
import pt from "../../i18n/messages/pt.json";
import es from "../../i18n/messages/es.json";
import { Toaster } from "react-hot-toast";
import SessionProvider from "@/components/providers/SessionProvider";
import { ConfettiProvider } from "../../components/providers/confetti-provider";
import Footer from "@/components/Footer";
import ReferralTracker from "@/components/ReferralTracker";
import SyncHtmlDir from "@/components/SyncHtmlDir";
import TrackingPixels from "@/components/TrackingPixels";
import { AttributionCapture } from "@/components/AttributionCapture";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const localeMessages: Record<string, Record<string, unknown>> = { ar, en, fr, tr, id, pt, es };
const VALID_LOCALES = ["ar", "en", "fr", "tr", "id", "pt", "es"] as const;
const DEFAULT_LOCALE = "ar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = (VALID_LOCALES.includes(rawLocale as (typeof VALID_LOCALES)[number]) ? rawLocale : DEFAULT_LOCALE) as Locale;
  const seo = LOCALE_SEO[locale];
  const alternates = buildHreflang("/", locale);

  return {
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    keywords: seo.keywords,
    icons: { icon: "/logo.png" },
    alternates,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}/${locale}`,
      siteName: seo.siteName,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: seo.siteName }],
      locale: OG_LOCALE_MAP[locale],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function Rootlayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // NOTE: We deliberately do NOT call getServerSession() here. Calling it reads cookies,
  // which opts the entire route (and every nested page) out of static rendering — that
  // means PSI / Lighthouse re-runs full SSR on every audit, blowing TTFB. Instead we
  // pass session={null} and let the client-side useSession() in Navbar fetch
  // /api/auth/session asynchronously after first paint. This keeps the layout
  // ISR-cacheable so PSI gets sub-100 ms TTFB from CDN.
  const { locale: rawLocale } = await params;
  const locale = VALID_LOCALES.includes(rawLocale as (typeof VALID_LOCALES)[number])
    ? rawLocale
    : DEFAULT_LOCALE;
  const messages = localeMessages[locale] ?? localeMessages[DEFAULT_LOCALE];
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <IntlProviderClient locale={locale || "ar"} messages={messages}>
      <SyncHtmlDir locale={locale} />
      <TrackingPixels>
        <AttributionCapture />
        <ReferralTracker />
        <div dir={dir} lang={locale === "ar" ? "ar" : locale === "fr" ? "fr" : locale === "tr" ? "tr" : locale === "id" ? "id" : locale === "pt" ? "pt" : locale === "es" ? "es" : "en"}>
          <CurrencyProvider>
            <Suspense fallback={null}>
              <CurrencyFromUrlSync />
            </Suspense>
            <SessionProvider>
              <Navbar />
            <main className="pt-16 lg:pt-[104px]">
              {children}
            </main>
            <Footer />
            <ConfettiProvider />
            <Toaster position="top-center" />
          </SessionProvider>
        </CurrencyProvider>
        <Analytics />
        <SpeedInsights />
      </div>
      </TrackingPixels>
    </IntlProviderClient>
  );
}