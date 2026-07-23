import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const marketingRedirects = [
  ["/dashboard/marketing/ai-assistant", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing/campaign-links", "/dashboard/marketing/attribution"],
  ["/dashboard/marketing/campaign-links/:id", "/dashboard/marketing/attribution?linkId=:id"],
  ["/dashboard/marketing/campaign-operating-center", "/dashboard/marketing/attribution"],
  ["/dashboard/marketing/command-center", "/dashboard/marketing"],
  ["/dashboard/marketing/connections", "/dashboard/platform-connections/ad-accounts"],
  ["/dashboard/marketing/connections/catalog", "/dashboard/platform-connections/ad-accounts"],
  ["/dashboard/marketing/connections/health", "/dashboard/platform-connections/health"],
  ["/dashboard/marketing/data-sync", "/dashboard/platform-connections/ad-accounts"],
  ["/dashboard/marketing/google-ads", "/dashboard/marketing/performance"],
  ["/dashboard/marketing/insights", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing/quality", "/dashboard/marketing/tracking"],
  ["/dashboard/marketing/results", "/dashboard/marketing/performance"],
  ["/dashboard/marketing/sync-log", "/dashboard/platform-connections/logs"],
  ["/dashboard/marketing/tracking-hub", "/dashboard/marketing/tracking"],
  ["/dashboard/marketing-intelligence", "/dashboard/marketing"],
  ["/dashboard/marketing-intelligence/action-items", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/ads-recommendations", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/attribution-verification", "/dashboard/marketing/attribution"],
  ["/dashboard/marketing-intelligence/audit", "/dashboard/marketing/tracking"],
  ["/dashboard/marketing-intelligence/budget-decisions", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/budget-recommendations", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/campaign-links", "/dashboard/marketing/attribution"],
  ["/dashboard/marketing-intelligence/campaign-links/health", "/dashboard/marketing/attribution"],
  ["/dashboard/marketing-intelligence/conversion-value-audit", "/dashboard/marketing/tracking"],
  ["/dashboard/marketing-intelligence/data", "/dashboard/marketing/performance"],
  ["/dashboard/marketing-intelligence/decisions", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/executive-overview", "/dashboard/marketing"],
  ["/dashboard/marketing-intelligence/final-readiness", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/launch-readiness", "/dashboard/marketing/recommendations"],
  ["/dashboard/marketing-intelligence/meta-sync", "/dashboard/platform-connections/ad-accounts"],
  ["/dashboard/marketing-intelligence/platform-metrics", "/dashboard/marketing/performance"],
  ["/dashboard/marketing-intelligence/platform-metrics/import", "/dashboard/platform-connections/ad-accounts"],
  ["/dashboard/marketing-intelligence/platform-status", "/dashboard/platform-connections"],
  ["/dashboard/marketing-intelligence/platform-sync", "/dashboard/platform-connections/ad-accounts"],
  ["/dashboard/marketing-intelligence/repair-center", "/dashboard/marketing/tracking"],
  ["/dashboard/marketing-intelligence/site-vs-platform", "/dashboard/marketing/attribution"],
  ["/dashboard/marketing-intelligence/system-map", "/dashboard/marketing"],
  ["/dashboard/marketing-intelligence/test-checklist", "/dashboard/marketing/tracking"],
  ["/dashboard/link-generator", "/dashboard/marketing/attribution#builder"],
  ["/dashboard/conversion-events", "/dashboard/marketing/tracking"],
  ["/dashboard/conversion-events/timeline", "/dashboard/marketing/tracking"],
  ["/dashboard/conversion-events/retry-truth", "/dashboard/marketing/tracking"],
] as const;

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "motion", "@radix-ui/react-icons", "date-fns", "react-use"],
    optimizeCss: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
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
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  devIndicators: { position: "bottom-right" },
  reactStrictMode: true,
  serverExternalPackages: ["@usewaypoint/email-builder"],
  compiler: { removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false },
  async rewrites() {
    return [
      { source: "/api/admin/subscriptions/chart", destination: "/api/admin/subscriptions/overview/chart" },
      { source: "/api/admin/subscriptions/stats", destination: "/api/admin/subscriptions/overview/stats" },
    ];
  },
  async redirects() {
    return [
      ...marketingRedirects.map(([source, destination]) => ({ source, destination, permanent: false })),
      { source: "/page/biz-kimiz", destination: "/tr/about-us", permanent: true },
      { source: "/page/saglik", destination: "/tr", permanent: true },
      { source: "/page/yardim", destination: "/tr/contact-us", permanent: true },
      { source: "/ar/donates", destination: "/ar/campaigns", permanent: true },
      { source: "/donates", destination: "/en/campaigns", permanent: true },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
