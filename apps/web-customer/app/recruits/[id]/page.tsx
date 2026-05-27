"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface RecruitData {
  id: string;
  targetLevel: number;
  levelTolerance: number;
  maxParticipants: number;
  deadline: string;
  status: string;
  order: {
    id: string;
    userId: string;
    startAt: string;
    endAt: string;
    status: string;
    user: { nickname: string; level: number; wechatId: string };
    court: { id: string; code: string; name: string };
  };
  participants: { id: string; userId: string; status: string; user: { nickname: string; level: number } }[];
}

export default function RecruitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const isLoggedIn = typeof window !== "undefined" && !!api.getToken();

  // Fetch current user
  useEffect(() => {
    if (!isLoggedIn) return;
    api.get<{ data: { id: string; level: string } }>("/api/auth/me").then((res) => {
      if (res.data) { setCurrentUserId(res.data.id); setCurrentLevel(Number(res.data.level)); }
    }).catch(() => {});
  }, [isLoggedIn]);

  const { data, isLoading } = useQuery({
    queryKey: ["recruit", id],
    queryFn: () => api.get<{ data: RecruitData }>(`/api/recruits/${id}`),
  });

  const recruit = data?.data;
  const joinedCount = recruit?.participants?.filter((p) => p.status === "JOINED").length || 0;
  const initiator = recruit?.order?.user;

  // Check if current user already joined
  const myParticipation = recruit?.participants?.find(
    (p) => p.userId === currentUserId && p.status === "JOINED"
  );
  const isInitiator = currentUserId && recruit?.order?.userId === currentUserId;

  const joinMut = useMutation({
    mutationFn: () => api.post(`/api/recruits/${id}/join`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recruit", id] }); queryClient.invalidateQueries({ queryKey: ["recruits"] }); toast.success("已加入"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "加入失败"),
  });

  const leaveMut = useMutation({
    mutationFn: () => api.post(`/api/recruits/${id}/leave`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recruit", id] }); toast.success("已取消加入"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "操作失败"),
  });

  const cancelMut = useMutation({
    mutationFn: () => api.patch(`/api/recruits/${id}/cancel-by-initiator`),
    onSuccess: () => {
      toast.success("招募已取消");
      queryClient.invalidateQueries({ queryKey: ["recruit", id] });
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      router.push("/recruits");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "取消失败"),
  });

  const copyWechat = (wx: string) => {
    navigator.clipboard.writeText(wx);
    toast.success("已复制微信号");
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!recruit) return <div className="text-center py-12 text-gray-500">招募不存在</div>;

  const isRecruiting = recruit.status === "RECRUITING";
  const isFull = joinedCount >= recruit.maxParticipants;
  const recruitMin = (recruit as Record<string,unknown>).minLevel != null ? Number((recruit as Record<string,unknown>).minLevel) : Number(recruit.targetLevel) - Number(recruit.levelTolerance);
  const recruitMax = (recruit as Record<string,unknown>).maxLevel != null ? Number((recruit as Record<string,unknown>).maxLevel) : Number(recruit.targetLevel) + Number(recruit.levelTolerance);
  const levelMatch = !currentLevel || (currentLevel >= recruitMin && currentLevel <= recruitMax);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/recruits")} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
        <h1 className="text-2xl font-bold">招募详情</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">发起人</span>
            <div className="flex items-center gap-2">
              <span>{initiator?.nickname}</span>
              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">段位 {String(initiator?.level)}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">微信号</span>
            <div className="flex items-center gap-1">
              <span>{initiator?.wechatId}</span>
              <Button variant="ghost" size="sm" className="h-5 text-xs px-1 text-blue-600" onClick={() => copyWechat(initiator?.wechatId || "")}>复制</Button>
            </div>
          </div>
          <div className="flex justify-between"><span className="text-gray-500">场地</span><span>{recruit.order?.court?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">时间</span><span>{new Date(recruit.order?.startAt).toLocaleString("zh-CN")} ~ {new Date(recruit.order?.endAt).toLocaleString("zh-CN")}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">段位要求</span><span>{recruitMin.toFixed(1)} ~ {recruitMax.toFixed(1)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">人数</span><span className="font-medium">{joinedCount}/{recruit.maxParticipants}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">截止</span><span>{new Date(recruit.deadline).toLocaleString("zh-CN")}</span></div>
          <div className="flex justify-between">
            <span className="text-gray-500">状态</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              recruit.status === "RECRUITING" ? "bg-blue-100 text-blue-800" :
              recruit.status === "CONFIRMED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {recruit.status === "RECRUITING" ? "招募中" : recruit.status === "CONFIRMED" ? "已确认" : recruit.status === "CANCELLED" ? "已取消" : "已过期"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      {recruit.participants && recruit.participants.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium text-sm">参与者</h3>
            {recruit.participants.map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span>{p.user?.nickname}</span>
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">段位 {String(p.user?.level)}</span>
                  {p.userId === recruit.order?.userId && <span className="text-xs text-gray-400">发起人</span>}
                </div>
                <span className={p.status === "JOINED" ? "text-green-600" : "text-gray-400"}>{p.status === "JOINED" ? "已加入" : "已退出"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {isRecruiting && !isFull && (
        <div className="space-y-2">
          {!isLoggedIn && (
            <Button className="w-full" onClick={() => router.push(`/login?redirect=/recruits/${id}`)}>登录后加入</Button>
          )}
          {isLoggedIn && isInitiator && (
            <div className="space-y-2">
              <div className="text-center text-sm text-gray-400 py-1">你是发起人</div>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
              >
                {cancelMut.isPending ? "处理中..." : "取消发布"}
              </Button>
            </div>
          )}
          {isLoggedIn && !isInitiator && myParticipation && (
            <Button className="w-full" variant="destructive" onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}>
              {leaveMut.isPending ? "处理中..." : "取消加入"}
            </Button>
          )}
          {isLoggedIn && !isInitiator && !myParticipation && levelMatch && (
            <Button className="w-full" onClick={() => joinMut.mutate()} disabled={joinMut.isPending}>
              {joinMut.isPending ? "加入中..." : "加入这个招募"}
            </Button>
          )}
          {isLoggedIn && !isInitiator && !myParticipation && !levelMatch && (
            <Button className="w-full" disabled>段位不符</Button>
          )}
        </div>
      )}
      {isRecruiting && isFull && (
        <div className="text-center text-sm text-gray-400 py-2">已满员</div>
      )}
    </div>
  );
}
