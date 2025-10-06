import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['puppeteer-extra', 'puppeteer-extra-plugin-stealth'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth'];
    }
    return config;
  },
  experimental: {
    serverActions: true
  },
};

export default nextConfig;
