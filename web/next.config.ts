import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Local volume uploads (/uploads/*) and /seed/* are served directly without external image CDN
    unoptimized: true,
  },
};

export default nextConfig;
