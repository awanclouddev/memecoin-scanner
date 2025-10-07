import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['puppeteer-extra', 'puppeteer-extra-plugin-stealth'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth'];
    }
    return config;
  },
  // experimental: { serverActions: true }, // removed to satisfy Next.js type checks
};

export default nextConfig;
