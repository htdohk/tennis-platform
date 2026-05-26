"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderData {
  id: string;
  userId: string;
  courtId: string;
  startAt: string;
  endAt: string;
  status: string;
  type: string;
  totalPrice: string | null;
  paidStatus: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; nickname: string; phone: string };
  court: { id: string; code: string; name: string; venue: { id: string; name: string } };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRM: "待确认",
  CONFIRMED: "已确认",
  RECRUITING: "招募中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  RECRUITING_EXPIRED: "招募过期",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_CONFIRM: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  RECRUITING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-800",
  RECRUITING_EXPIRED: "bg-red-100 text-red-800",
};

const ACTION_LABELS: Record<string, string> = {
  confirm: "确认订单",
  cancel: "取消订单",
  complete: "完成订单",
  markPaid: "标记已付款",
};

function useUndoableAction(queryClient: ReturnType<typeof useQueryClient>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  return useCallback(
    (action: "confirm" | "cancel" | "complete" | "markPaid", orderId: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }

      let cancelled = false;

      const timer = setTimeout(async () => {
        if (cancelled) return;
        timerRef.current = null;
        toastIdRef.current = null;
        try {
          await api.patch(`/admin/orders/${orderId}/${action === "markPaid" ? "mark-paid" : action}`);
          queryClient.invalidateQueries({ queryKey: ["schedule"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast.success(`${ACTION_LABELS[action]}成功`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "操作失败";
          toast.error(msg);
        }
      }, 10000);

      timerRef.current = timer;

      toastIdRef.current = toast(`即将${ACTION_LABELS[action]}...`, {
        duration: 10000,
        action: {
          label: "撤销",
          onClick: () => {
            cancelled = true;
            clearTimeout(timer);
            timerRef.current = null;
            toastIdRef.current = null;
            toast.info("已撤销操作");
          },
        },
      });
    },
    [queryClient],
  );
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const undo = useUndoableAction(queryClient);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () => {
      const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      return api.get<{ data: OrderData[] }>(`/admin/orders${qs}`);
    },
  });

  const { data: courtsRes } = useQuery({
    queryKey: ["courts"],
    queryFn: () => api.get<{ data: { id: string; code: string; name: string }[] }>("/admin/courts"),
  });

  const orders = ordersRes?.data || [];
  const courts = courtsRes?.data || [];

  // Client-side filters
  const filtered = orders.filter((o) => {
    if (dateFilter && !o.startAt.startsWith(dateFilter)) return false;
    if (courtFilter !== "all" && o.courtId !== courtFilter) return false;
    return true;
  });

  const openDetail = (order: OrderData) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">订单管理</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <Label className="text-xs">状态</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[280px]">
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="PENDING_CONFIRM">待确认</SelectItem>
              <SelectItem value="CONFIRMED">已确认</SelectItem>
              <SelectItem value="RECRUITING">招募中</SelectItem>
              <SelectItem value="COMPLETED">已完成</SelectItem>
              <SelectItem value="CANCELLED">已取消</SelectItem>
              <SelectItem value="RECRUITING_EXPIRED">招募过期</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">日期</Label>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label className="text-xs">场地</Label>
          <Select value={courtFilter} onValueChange={(v) => setCourtFilter(v || "all")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[280px]">
              <SelectItem value="all">全部场地</SelectItem>
              {courts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== "all" || dateFilter || courtFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setDateFilter(""); setCourtFilter("all"); }}>
            清除筛选
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">用户</th>
              <th className="text-left p-3 font-medium">场地</th>
              <th className="text-left p-3 font-medium">时间</th>
              <th className="text-left p-3 font-medium">状态</th>
              <th className="text-left p-3 font-medium">类型</th>
              <th className="text-left p-3 font-medium">金额</th>
              <th className="text-left p-3 font-medium">付款</th>
              <th className="text-left p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{order.user?.nickname || order.user?.phone}</td>
                <td className="p-3 text-gray-600">{order.court?.code}</td>
                <td className="p-3 text-xs text-gray-600">
                  {new Date(order.startAt).toLocaleString("zh-CN")}<br />
                  ~ {new Date(order.endAt).toLocaleString("zh-CN")}
                </td>
                <td className="p-3">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[order.status])}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </td>
                <td className="p-3 text-gray-600">{order.type === "RECRUIT" ? "招募" : "包场"}</td>
                <td className="p-3">{order.totalPrice ? `¥${Number(order.totalPrice)}` : "-"}</td>
                <td className="p-3">
                  <span className={order.paidStatus === "PAID" ? "text-green-600" : "text-yellow-600"}>
                    {order.paidStatus === "PAID" ? "已付" : "未付"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openDetail(order)}>详情</Button>
                    {(order.status === "PENDING_CONFIRM" || order.status === "RECRUITING_EXPIRED") && (
                      <Button size="sm" variant="default" onClick={() => undo("confirm", order.id)}>确认</Button>
                    )}
                    {order.status === "CONFIRMED" && (
                      <Button size="sm" variant="secondary" onClick={() => undo("complete", order.id)}>订单完成</Button>
                    )}
                    {(order.status === "PENDING_CONFIRM" || order.status === "CONFIRMED" || order.status === "RECRUITING") && (
                      <Button size="sm" variant="destructive" onClick={() => undo("cancel", order.id)}>订单取消</Button>
                    )}
                    {order.paidStatus === "UNPAID" && (
                      <Button size="sm" variant="outline" onClick={() => undo("markPaid", order.id)}>标记付款</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">暂无订单</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">订单号</span><span className="font-mono">{selectedOrder.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">用户</span><span>{selectedOrder.user?.nickname} ({selectedOrder.user?.phone})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">场地</span><span>{selectedOrder.court?.code} - {selectedOrder.court?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">时间</span><span>{new Date(selectedOrder.startAt).toLocaleString("zh-CN")} ~ {new Date(selectedOrder.endAt).toLocaleString("zh-CN")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">状态</span><span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[selectedOrder.status])}>{STATUS_LABELS[selectedOrder.status]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">金额</span><span>{selectedOrder.totalPrice ? `¥${Number(selectedOrder.totalPrice)}` : "-"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">付款</span><span>{selectedOrder.paidStatus === "PAID" ? "已付款" : "未付款"}</span></div>
              {selectedOrder.notes && <div className="flex justify-between"><span className="text-gray-500">备注</span><span>{selectedOrder.notes}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
