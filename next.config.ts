import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [],
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: '/clothing-order-manager',
  assetPrefix: '/clothing-order-manager',
};

export default nextConfig;
