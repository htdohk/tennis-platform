"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecruitData {
  id: string;
  orderId: string;
  targetLevel: string;
  levelTolerance: string;
  maxParticipants: number;
  deadline: string;
  status: string;
  order: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    notes: string | null;
    user: { id: string; nickname: string; phone: string; wechatId: string };
    court: { id: string; code: string; name: string };
  };
  participants: { id: string; userId: string; status: string; user: { nickname: string; phone: string } }[];
}

const STATUS_LABELS: Record<string, string> = {
  RECRUITING: "招募中",
  CONFIRMED: "已确认",
  CANCELLED: "已取消",
  RECRUITING_EXPIRED: "招募过期",
};

const STATUS_COLORS: Record<string, string> = {
  RECRUITING: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RECRUITING_EXPIRED: "bg-red-100 text-red-800",
};

export default function RecruitsPage() {
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecruit, setSelectedRecruit] = useState<RecruitData | null>(null);

  const { data: recruitsRes, isLoading } = useQuery({
    queryKey: ["admin-recruits"],
    queryFn: () => api.get<{ data: RecruitData[] }>("/admin/recruits"),
  });

  const recruits = recruitsRes?.data || [];

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/recruits/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recruits"] });
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("已取消");
    },
    onError: () => toast.error("操作失败"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">招募管理</h1>

      <div className="border rounded-lg bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">发起人</th>
              <th className="text-left p-3 font-medium">场地</th>
              <th className="text-left p-3 font-medium">时间</th>
              <th className="text-left p-3 font-medium">段位要求</th>
              <th className="text-left p-3 font-medium">人数</th>
              <th className="text-left p-3 font-medium">截止</th>
              <th className="text-left p-3 font-medium">状态</th>
              <th className="text-left p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {recruits.map((r) => {
              const participantCount = r.participants?.filter((p) => p.status === "JOINED").length || 0;
              return (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div>{r.order?.user?.nickname}</div>
                    <div className="text-xs text-gray-400">{r.order?.user?.wechatId}</div>
                  </td>
                  <td className="p-3 text-gray-600">{r.order?.court?.code} - {r.order?.court?.name}</td>
                  <td className="p-3 text-xs text-gray-600">
                    {new Date(r.order?.startAt).toLocaleString("zh-CN")}<br />
                    ~ {new Date(r.order?.endAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="p-3">
                    {String(r.targetLevel)} ± {String(r.levelTolerance)}
                  </td>
                  <td className="p-3">
                    <span className={participantCount >= r.maxParticipants ? "text-green-600 font-medium" : ""}>
                      {participantCount}/{r.maxParticipants}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(r.deadline).toLocaleString("zh-CN")}
                  </td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[r.status])}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRecruit(r); setDetailOpen(true); }}>详情</Button>
                      {r.status === "RECRUITING" && (
                        <Button size="sm" variant="destructive" onClick={() => cancelMut.mutate(r.id)}>取消</Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {recruits.length === 0 && !isLoading && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">暂无招募</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>招募详情</DialogTitle>
          </DialogHeader>
          {selectedRecruit && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">发起人</span><span>{selectedRecruit.order?.user?.nickname} ({selectedRecruit.order?.user?.phone})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">微信号</span><span>{selectedRecruit.order?.user?.wechatId}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">场地</span><span>{selectedRecruit.order?.court?.code} - {selectedRecruit.order?.court?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">时间</span><span>{new Date(selectedRecruit.order?.startAt).toLocaleString("zh-CN")} ~ {new Date(selectedRecruit.order?.endAt).toLocaleString("zh-CN")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">段位要求</span><span>{String(selectedRecruit.targetLevel)} ± {String(selectedRecruit.levelTolerance)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">人数</span><span>{selectedRecruit.participants?.filter((p) => p.status === "JOINED").length || 0}/{selectedRecruit.maxParticipants}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">截止时间</span><span>{new Date(selectedRecruit.deadline).toLocaleString("zh-CN")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">状态</span><span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[selectedRecruit.status])}>{STATUS_LABELS[selectedRecruit.status]}</span></div>

              {/* Participants */}
              {selectedRecruit.participants && selectedRecruit.participants.length > 0 && (
                <div>
                  <span className="text-gray-500">参与者</span>
                  <ul className="mt-1 space-y-1">
                    {selectedRecruit.participants.map((p) => (
                      <li key={p.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                        <span>{p.user?.nickname || p.user?.phone}</span>
                        <span className={p.status === "JOINED" ? "text-green-600" : "text-gray-400"}>
                          {p.status === "JOINED" ? "已加入" : "已退出"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
