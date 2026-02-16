import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Must match a file that exists at project root (i18n/request.ts)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    domains: ['i.ibb.co','example.com','res.cloudinary.com','images.unsplash.com','via.placeholder.com','gozbebekleri.org','muslimglobalrelief.org'],
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
};

module.exports = withNextIntl(nextConfig);
