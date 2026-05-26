"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MapPin, Grid3X3, DollarSign, Users,
  Calendar, ClipboardList, UserPlus,
  LogOut, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/schedule", label: "日程看板", icon: Calendar },
  { href: "/admin/orders", label: "订单管理", icon: ClipboardList },
  { href: "/admin/venues", label: "场馆管理", icon: MapPin },
  { href: "/admin/courts", label: "场地管理", icon: Grid3X3 },
  { href: "/admin/prices", label: "价格管理", icon: DollarSign },
  { href: "/admin/recruits", label: "招募管理", icon: UserPlus },
  { href: "/admin/users", label: "用户管理", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const isClient = typeof window !== "undefined";

  useEffect(() => {
    if (!isLoginPage && !api.getToken()) {
      router.push("/admin/login");
    }
  }, [router, isLoginPage]);

  // Login page: render cleanly without sidebar or auth check
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Auth guard: wait for token check
  if (isClient && !api.getToken()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
        <span className="font-bold text-lg">Tennis Admin</span>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      <div className="flex">
        <aside className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-64",
        )}>
          <div className="flex items-center h-16 px-6 border-b">
            <span className="font-bold text-xl">Tennis Admin</span>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-4 left-4 right-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600"
              onClick={() => { api.setToken(null); router.push("/admin/login"); }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </aside>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main className="flex-1 p-4 lg:p-8 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
