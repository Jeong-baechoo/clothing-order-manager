import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "의류 주문 관리",
  description: "의류 주문을 관리하는 애플리케이션",
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
            backgroundSize: '1300px auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.2,
            zIndex: 0
          }}
        />
        <Navbar />
        <main className="container mx-auto px-4 py-8 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
