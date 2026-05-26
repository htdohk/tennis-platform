"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRM: "待确认", CONFIRMED: "已确认", RECRUITING: "招募中",
  COMPLETED: "已完成", CANCELLED: "已取消", RECRUITING_EXPIRED: "招募过期",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ data: { id: string; startAt: string; endAt: string; status: string; type: string; totalPrice: string | null; paidStatus: string; notes: string | null; court: { code: string; name: string; venue: { name: string } }; user: { nickname: string; phone: string } } }>(`/api/orders/${id}`),
  });

  const order = orderRes?.data;

  if (isLoading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!order) return <div className="text-center py-12 text-gray-500">订单不存在</div>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/me/orders" className="text-sm text-gray-400 hover:text-gray-600">← 返回</Link>
        <h1 className="text-2xl font-bold">订单详情</h1>
      </div>

      <div className="border rounded-xl bg-white p-6 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">订单号</span><span className="font-mono">{order.id.slice(0, 12)}...</span></div>
        <div className="flex justify-between"><span className="text-gray-500">场馆</span><span>{order.court?.venue?.name}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">场地</span><span>{order.court?.code} - {order.court?.name}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">时间</span><span>{new Date(order.startAt).toLocaleString("zh-CN")} ~ {new Date(order.endAt).toLocaleString("zh-CN")}</span></div>
        <div className="flex justify-between">
          <span className="text-gray-500">状态</span>
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
            order.status === "PENDING_CONFIRM" ? "bg-yellow-100 text-yellow-800" :
            order.status === "CONFIRMED" ? "bg-green-100 text-green-800" :
            order.status === "RECRUITING" ? "bg-blue-100 text-blue-800" :
            "bg-gray-100 text-gray-600"
          )}>{STATUS_LABELS[order.status] || order.status}</span>
        </div>
        <div className="flex justify-between"><span className="text-gray-500">类型</span><span>{order.type === "RECRUIT" ? "招募局" : "包场"}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">金额</span><span>{order.totalPrice ? `¥${Number(order.totalPrice)}` : "-"}</span></div>
        {order.notes && <div className="flex justify-between"><span className="text-gray-500">备注</span><span>{order.notes}</span></div>}
      </div>
    </div>
  );
}
