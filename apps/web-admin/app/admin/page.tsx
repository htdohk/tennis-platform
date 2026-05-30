"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, MapPin, Users as UsersIcon, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getWeekRange() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    from: monday.toISOString().split("T")[0],
    to: sunday.toISOString().split("T")[0],
  };
}

const DAY_LABELS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

function getColor(rate: number, cancelled: number) {
  if (cancelled > 0) return "bg-red-400 hover:bg-red-500";
  if (rate >= 0.8) return "bg-green-600 hover:bg-green-700";
  if (rate >= 0.2) return "bg-green-300 hover:bg-green-400";
  return "bg-gray-200 hover:bg-gray-300";
}

function TooltipCell({
  day,
  venueId,
  onClick,
}: {
  day: { date: string; utilizationRate: number; cancelledCount: number; bookedSlots: number; totalSlots: number };
  venueId: string;
  onClick: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <td className="p-0.5 relative">
      <div
        className={`w-9 h-9 rounded-sm cursor-pointer transition-colors ${getColor(day.utilizationRate, day.cancelledCount)}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={onClick}
      />
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none">
          {day.date} 利用率 {Math.round(day.utilizationRate * 100)}%&nbsp;&nbsp;取消 {day.cancelledCount} 单&nbsp;&nbsp;已订 {day.bookedSlots}/{day.totalSlots} 时段
        </div>
      )}
    </td>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: () => api.get<{ data: { createdAt?: string }[] }>("/admin/orders") });
  const { data: courts } = useQuery({ queryKey: ["courts"], queryFn: () => api.get<{ data: unknown[] }>("/admin/courts") });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get<{ data: unknown[] }>("/admin/users") });
  const { data: recruits } = useQuery({ queryKey: ["recruits"], queryFn: () => api.get<{ data: { status: string }[] }>("/api/recruits") });

  const weekRange = getWeekRange();
  const { data: utilization } = useQuery({
    queryKey: ["dashboard-utilization", weekRange.from, weekRange.to],
    queryFn: () =>
      api.get<{ data: { venues: { venueId: string; venueName: string; days: { date: string; totalSlots: number; bookedSlots: number; cancelledCount: number; utilizationRate: number }[] }[] } }>(
        `/admin/dashboard/utilization?from=${weekRange.from}&to=${weekRange.to}`
      ),
  });

  const today = new Date().toISOString().split("T")[0];
  const todayOrders = (orders?.data || []).filter((o) => o.createdAt?.startsWith(today)).length;
  const stats = [
    { label: "今日订单", value: todayOrders, icon: CalendarCheck, href: "/admin/orders" },
    { label: "场地总数", value: courts?.data?.length ?? "-", icon: MapPin, href: "/admin/courts" },
    { label: "用户总数", value: users?.data?.length ?? "-", icon: UsersIcon, href: "/admin/users" },
    { label: "招募中", value: (recruits?.data || []).filter((r) => r.status === "RECRUITING").length, icon: ClipboardList, href: "/admin/recruits" },
  ];

  const venues = utilization?.data?.venues || [];

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

      {venues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">场馆利用率（本周）</CardTitle>
            <p className="text-sm text-gray-500">
              {weekRange.from} ~ {weekRange.to}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-500 pr-4 py-1 w-24">场馆</th>
                    {DAY_LABELS.map((d) => (
                      <th key={d} className="text-center text-xs font-medium text-gray-500 px-1 py-1 w-12">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue) => (
                    <tr key={venue.venueId}>
                      <td className="text-sm pr-4 py-1 truncate max-w-[120px]">{venue.venueName}</td>
                      {venue.days.map((day) => (
                        <TooltipCell
                          key={day.date}
                          day={day}
                          venueId={venue.venueId}
                          onClick={() => router.push(`/admin/schedule?venueId=${venue.venueId}&date=${day.date}`)}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-600 rounded-sm" /> &ge;80% 利用率</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-300 rounded-sm" /> 20-79%</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded-sm" /> &lt;20%</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm" /> 有取消</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
