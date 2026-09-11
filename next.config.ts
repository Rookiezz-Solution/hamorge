import type { NextConfig } from "next";

const wpHostname = process.env.NEXT_PUBLIC_WP_URL
  ? new URL(process.env.NEXT_PUBLIC_WP_URL).hostname
  : '';

const nextConfig: NextConfig = {
  // Default is 60s. Our WooCommerce host is shared hosting, not built for build-time
  // bursts — this gives slow product/variation fetches room to finish instead of
  // failing the whole deploy. See VARIATION_FETCH_CONCURRENCY in app/shop/page.tsx
  // for the actual fix (limiting concurrent requests); this is just a safety margin.
  staticPageGenerationTimeout: 180,
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
