import type { NextConfig } from "next";

const wpHostname = process.env.NEXT_PUBLIC_WP_URL
  ? new URL(process.env.NEXT_PUBLIC_WP_URL).hostname
  : '';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.figma.com' },
      { protocol: 'https', hostname: 'hamorge.com' },
      { protocol: 'https', hostname: '**.hostingersite.com' },
      ...(wpHostname ? [{ protocol: 'https' as const, hostname: wpHostname }] : []),
    ],
  },
};

export default nextConfig;
