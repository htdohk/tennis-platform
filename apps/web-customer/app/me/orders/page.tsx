"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRM: "待确认", CONFIRMED: "已确认", RECRUITING: "招募中",
  COMPLETED: "已完成", CANCELLED: "已取消", RECRUITING_EXPIRED: "招募过期",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING_CONFIRM: "bg-yellow-100 text-yellow-800", CONFIRMED: "bg-green-100 text-green-800",
  RECRUITING: "bg-blue-100 text-blue-800", COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-800", RECRUITING_EXPIRED: "bg-red-100 text-red-800",
};

export default function MyOrdersPage() {
  const router = useRouter();

  useEffect(() => {
    if (!api.getToken()) { router.push("/login?redirect=/me/orders"); return; }
  }, [router]);

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get<{ data: { id: string; startAt: string; endAt: string; status: string; type: string; totalPrice: string | null; court: { code: string; name: string } }[] }>("/api/orders/me"),
  });

  const orders = ordersRes?.data || [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/me" className="text-sm text-gray-400 hover:text-gray-600">← 返回</Link>
        <h1 className="text-2xl font-bold">我的订单</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">暂无订单</p>
          <Link href="/booking" className="text-blue-600 hover:underline">去预订</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`}>
              <div className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{o.court?.code} - {o.court?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(o.startAt).toLocaleString("zh-CN")} ~ {new Date(o.endAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[o.status])}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
