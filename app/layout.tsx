import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppChrome from "./components/layout/AppChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "케룸 온라인 수발주 통합관리 시스템",
  description: "CAELUM Online Purchase and Sale Order System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-900`}
      >
        {/* 배경 로고 */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('/images/caelum-logo-transparent.png')`,
            backgroundSize: '1100px auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.05,
            zIndex: 0
          }}
        />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
