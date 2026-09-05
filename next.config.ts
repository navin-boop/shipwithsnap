import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keeps the dev badge out of product screenshots (scripts/screenshots.sh).
  devIndicators: false,
};

export default nextConfig;
