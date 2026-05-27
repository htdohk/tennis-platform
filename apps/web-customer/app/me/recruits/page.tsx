"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecruitOrder {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  type: string;
  court: { code: string; name: string };
  recruitPost: {
    id: string;
    targetLevel: number;
    levelTolerance: number;
    maxParticipants: number;
    deadline: string;
    status: string;
    participants: { id: string; status: string }[];
  } | null;
}

export default function MyRecruitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!api.getToken()) { router.push("/login?redirect=/me/recruits"); }
  }, [router]);

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get<{ data: RecruitOrder[] }>("/api/orders/me"),
  });

  const orders = ordersRes?.data || [];
  const recruitOrders = orders.filter((o) => o.type === "RECRUIT" && o.recruitPost);

  const convertMut = useMutation({
    mutationFn: (id: string) => api.patch(`/api/recruits/${id}/convert-to-normal`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-orders"] }); toast.success("已转为包场"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "操作失败"),
  });

  const abandonMut = useMutation({
    mutationFn: (id: string) => api.patch(`/api/recruits/${id}/abandon`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-orders"] }); toast.success("已放弃"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "操作失败"),
  });

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    RECRUITING: { label: "招募中", color: "bg-blue-100 text-blue-800" },
    CONFIRMED: { label: "已确认", color: "bg-green-100 text-green-800" },
    RECRUITING_EXPIRED: { label: "招募失效", color: "bg-red-100 text-red-800" },
    CANCELLED: { label: "已取消", color: "bg-red-100 text-red-800" },
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">加载中...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/me" className="text-sm text-gray-400 hover:text-gray-600">← 返回</Link>
        <h1 className="text-2xl font-bold">我的招募</h1>
      </div>

      {recruitOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">暂无招募</p>
          <Link href="/recruits/new" className="text-blue-600 hover:underline">发起招募</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recruitOrders.map((o) => {
            const rp = o.recruitPost!;
            const joined = rp.participants?.filter((p) => p.status === "JOINED").length || 0;
            const config = STATUS_CONFIG[rp.status] || { label: rp.status, color: "bg-gray-100 text-gray-800" };
            return (
              <Card key={o.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/recruits/${rp.id}`} className="font-medium hover:underline">
                          {o.court?.code} - {o.court?.name}
                        </Link>
                        <span className={cn("text-xs px-2 py-0.5 rounded font-medium", config.color)}>{config.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(o.startAt).toLocaleString("zh-CN")} ~ {new Date(o.endAt).toLocaleString("zh-CN")}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        段位 {String(rp.targetLevel)} ± {String(rp.levelTolerance)} · 人数 {joined}/{rp.maxParticipants} · 截止 {new Date(rp.deadline).toLocaleString("zh-CN")}
                      </div>
                    </div>
                    {rp.status === "RECRUITING" && (
                      <Link href={`/recruits/${rp.id}`}><Button size="sm" variant="outline">查看</Button></Link>
                    )}
                  </div>

                  {rp.status === "RECRUITING_EXPIRED" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => convertMut.mutate(rp.id)} disabled={convertMut.isPending}>转为包场</Button>
                      <Button size="sm" variant="destructive" onClick={() => abandonMut.mutate(rp.id)} disabled={abandonMut.isPending}>放弃</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
