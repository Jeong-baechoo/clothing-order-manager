import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [],
  reactStrictMode: true,
  // output: 'export', // Vercel 배포를 위해 제거
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // basePath: '/clothing-order-manager', // Vercel 배포를 위해 제거
  // assetPrefix: '/clothing-order-manager', // Vercel 배포를 위해 제거
  outputFileTracingExcludes: {
    '*': ['**/.next/trace'],
  },
};

export default nextConfig;
