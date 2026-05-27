"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "网球馆";

export function Navbar() {
  const [nickname, setNickname] = useState<string | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const n = localStorage.getItem("customer_nickname");
      setNickname(n ?? "");
    };
    update();
    window.addEventListener("auth-change", update);
    return () => window.removeEventListener("auth-change", update);
  }, []);

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">{BRAND}</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-black">首页</Link>
          <Link href="/booking" className="text-gray-600 hover:text-black">预订</Link>
          <Link href="/recruits" className="text-gray-600 hover:text-black">招募</Link>
          {nickname === undefined ? (
            <span className="inline-block w-12 h-3 bg-gray-100 rounded animate-pulse" />
          ) : nickname ? (
            <Link href="/me" className="text-gray-800 font-medium hover:text-black">{nickname}</Link>
          ) : (
            <Link href="/login" className="text-gray-400 hover:text-black">未登录</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
