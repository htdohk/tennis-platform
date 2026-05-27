import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
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
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
