import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Must match a file that exists at project root (i18n/request.ts)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Tree-shake big icon / motion libraries so only the icons actually used hit the bundle.
  // Each of these emits a barrel-file that ships everything by default — without this option,
  // a single `import { Heart } from "lucide-react"` pulls in the entire icon set.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "motion",
      "@radix-ui/react-icons",
      "date-fns",
      "react-use",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
    // Trim the set of widths the optimizer produces. The defaults include very large widths
    // (3840) that the homepage never needs and cost cache + bandwidth.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "gozbebekleri.org" },
      { protocol: "https", hostname: "muslimglobalrelief.org" },
      { protocol: "https", hostname: "example.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "division.iium.edu.my" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: {
    position: 'bottom-right',
  },
  reactStrictMode: true,
  // Strip console.* calls from production bundles (preserve error/warn for prod debugging).
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  /** Avoid /subscriptions/[id] shadowing literal "chart" / "stats" segments (legacy URLs). */
  async rewrites() {
    return [
      {
        source: "/api/admin/subscriptions/chart",
        destination: "/api/admin/subscriptions/overview/chart",
      },
      {
        source: "/api/admin/subscriptions/stats",
        destination: "/api/admin/subscriptions/overview/stats",
      },
    ];
  },
  /**
   * 301 redirects from legacy gozbebekleri.org URLs to preserve Google SEO equity.
   * Old site was Turkish-only, so targets are the /tr locale.
   */
  async redirects() {
    return [
      {
        source: "/page/biz-kimiz",
        destination: "/tr/about-us",
        permanent: true,
      },
      {
        source: "/page/saglik",
        destination: "/tr",
        permanent: true,
      },
      {
        source: "/page/yardim",
        destination: "/tr/contact-us",
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
