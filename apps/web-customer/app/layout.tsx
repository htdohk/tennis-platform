import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "网球馆";

export const metadata: Metadata = {
  title: BRAND,
  description: "在线预订网球场，轻松找到球友",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <header className="bg-white border-b sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-bold text-lg">{BRAND}</Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/" className="text-gray-600 hover:text-black">首页</Link>
                <Link href="/booking" className="text-gray-600 hover:text-black">预订</Link>
                <Link href="/me" className="text-gray-600 hover:text-black">我的</Link>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
