import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    domains: ['i.ibb.co','res.cloudinary.com','images.unsplash.com','via.placeholder.com','gozbebekleri.org','muslimglobalrelief.org'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

module.exports = withNextIntl(nextConfig);
