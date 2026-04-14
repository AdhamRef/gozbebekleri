import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Must match a file that exists at project root (i18n/request.ts)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
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
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  reactStrictMode: true,
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
};

module.exports = withNextIntl(nextConfig);
