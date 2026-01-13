import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import { Poppins, Noto_Kufi_Arabic } from "next/font/google";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import SessionProvider from "@/components/providers/SessionProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/options";
import { ConfettiProvider } from "../../components/providers/confetti-provider";
import Footer from "@/components/Footer";
import "./globals.css";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import Head from "next/head"; // Import Head for manual font loading
import Script from "next/script";

// Configure the Poppins font for English text
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap", // Ensure fonts are swapped properly
});

// Configure Noto Kufi Arabic font for Arabic text
const notoKufiArabic = Noto_Kufi_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap", // Ensure fonts are swapped properly
});

// Global metadata
export const metadata: Metadata = {
  title: {
    default: "فريق قرة العيون في رمضان 25 | قرة العيون",
    template: "%s | قرة العيون",
  },
  description: "منصة قرة العيون لجمع التبرعات للقضايا الإنسانية الطبية في سوريا. ساعدنا في إحداث فرق في حياة المحتاجين.",
  keywords: ["تبرع", "جمع تبرعات", "قضايا إنسانية", "قرة العيون", "منصة قرة العيون"],
  icons: {
    icon: "https://i.ibb.co/ZwcJcN1/logo.webp",
  },
  openGraph: {
    title: "فريق قرة العيون في رمضان 25 | قرة العيون",
    description: "منصة قرة العيون لجمع التبرعات للقضايا الإنسانية الطبية في سوريا. ساعدنا في إحداث فرق في حياة المحتاجين.",
    url: "https://www.sandooq-alafiya.org", // Replace with your actual domain
    siteName: "قرة العيون",
    images: [
      {
        url: "https://alafiya.org/og-image.jpg", // Replace with your actual OG image
        width: 1200,
        height: 630,
        alt: "قرة العيون",
      },
    ],
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "فريق قرة العيون في رمضان 25 | قرة العيون",
    description: "منصة قرة العيون لجمع التبرعات للقضايا الإنسانية الطبية في سوريا. ساعدنا في إحداث فرق في حياة المحتاجين.",
    images: ["https://www.sandooq-alafiya.org/og-image.jpg"], // Replace with your actual OG image
  },
  alternates: {
    canonical: "https://www.alafiya.org", // Replace with your actual domain
  },
};

export default async function Rootlayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = params.locale;
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale || "ar"} dir={dir} suppressHydrationWarning>
      <Head>
        {/* Manually load Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Font Awesome Kit */}
      </Head>
        <Script src="https://kit.fontawesome.com/e895f0e5f8.js" crossOrigin="anonymous" strategy="afterInteractive" />
      <body
        className={`${poppins.variable} ${notoKufiArabic.variable} font-arabic antialiased`}
      >
        <NextIntlClientProvider messages={messages} locale={locale || "ar"}>
          <CurrencyProvider>
            <SessionProvider session={session}>
              <Navbar />
              <main dir={dir}>
                {children}
              </main>
              <Footer />
              <ConfettiProvider />
              <Toaster position="top-center" />
            </SessionProvider>
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
        <Analytics/>
        <SpeedInsights/>
    </html>
  );
}