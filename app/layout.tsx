import type { Metadata } from "next";
import { Poppins, Noto_Kufi_Arabic } from "next/font/google";

import "./[locale]/globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.gozbebekleri.com"),
  title: { default: "Gözbebekleri | قرة العيون", template: "%s | Gözbebekleri" },
  description: "Donate for urgent medical aid and humanitarian relief in Syria. Trusted charity platform for zakat, sadaqah, and emergency donations.",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical third-party origins to reduce LCP */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://i.ibb.co" />
        <link rel="preconnect" href="https://v6.exchangerate-api.com" />
        <link rel="preconnect" href="https://ipapi.co" />
        <link rel="preload" href="/bg.webp" as="image" type="image/webp" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${poppins.variable} ${notoKufiArabic.variable} font-arabic antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
