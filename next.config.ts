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
  webpack: (config) => {
    // React-PDF 관련 설정
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

export default nextConfig;
