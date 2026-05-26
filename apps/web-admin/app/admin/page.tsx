"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, MapPin, Users as UsersIcon, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: () => api.get<{ data: { createdAt?: string }[] }>("/admin/orders") });
  const { data: courts } = useQuery({ queryKey: ["courts"], queryFn: () => api.get<{ data: unknown[] }>("/admin/courts") });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get<{ data: unknown[] }>("/admin/users") });
  const { data: recruits } = useQuery({ queryKey: ["recruits"], queryFn: () => api.get<{ data: { status: string }[] }>("/api/recruits") });

  const today = new Date().toISOString().split("T")[0];
  const todayOrders = (orders?.data || []).filter((o) => o.createdAt?.startsWith(today)).length;
  const stats = [
    { label: "今日订单", value: todayOrders, icon: CalendarCheck, href: "/admin/orders" },
    { label: "场地总数", value: courts?.data?.length ?? "-", icon: MapPin, href: "/admin/courts" },
    { label: "用户总数", value: users?.data?.length ?? "-", icon: UsersIcon, href: "/admin/users" },
    { label: "招募中", value: (recruits?.data || []).filter((r) => r.status === "RECRUITING").length, icon: ClipboardList, href: "/admin/recruits" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-gray-500 mt-1">场馆运营概览</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{stat.value}</div></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
