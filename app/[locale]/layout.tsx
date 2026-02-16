import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import SessionProvider from "@/components/providers/SessionProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/options";
import { ConfettiProvider } from "../../components/providers/confetti-provider";
import Footer from "@/components/Footer";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
    url: "https://www.sandooq-gozbebekleri.org", // Replace with your actual domain
    siteName: "قرة العيون",
    images: [
      {
        url: "https://gozbebekleri.org/og-image.jpg", // Replace with your actual OG image
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
    images: ["https://www.sandooq-gozbebekleri.org/og-image.jpg"], // Replace with your actual OG image
  },
  alternates: {
    canonical: "https://www.gozbebekleri.org", // Replace with your actual domain
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
    <NextIntlClientProvider messages={messages} locale={locale || "ar"}>
      <CurrencyProvider>
        <SessionProvider session={session}>
          <Navbar />
          <main dir={dir} className="pt-20 lg:pt-32">
            {children}
          </main>
          <Footer />
          <ConfettiProvider />
          <Toaster position="top-center" />
        </SessionProvider>
      </CurrencyProvider>
      <Analytics />
      <SpeedInsights />
    </NextIntlClientProvider>
  );
}