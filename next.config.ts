import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [],
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages 배포를 위한 설정
  // 저장소 이름에 맞게 수정하세요 (예: /clothing-order-manager/)
  basePath: '/clothing-order-manager',
  assetPrefix: '/clothing-order-manager',
};

export default nextConfig;
