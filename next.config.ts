import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Must match a file that exists at project root (i18n/request.ts)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    domains: ['picsum.photos','i.ibb.co','example.com','res.cloudinary.com','images.unsplash.com','via.placeholder.com','gozbebekleri.org','muslimglobalrelief.org'],
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
