"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecruitData {
  id: string;
  targetLevel: number;
  levelTolerance: number;
  minLevel?: number | null;
  maxLevel?: number | null;
  maxParticipants: number;
  deadline: string;
  status: string;
  user: { nickname: string; level: number; wechatId: string };
  order: { id: string; userId: string; startAt: string; endAt: string; status: string; court: { id: string; code: string; name: string } };
  participants: { userId: string }[];
}

function RecruitsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "square";
  const queryClient = useQueryClient();

  const [dateFilter, setDateFilter] = useState("");
  const [minLevelFilter, setMinLevelFilter] = useState("all");
  const [maxLevelFilter, setMaxLevelFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(0);

  // Get current user
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get<{ data: { id: string; level: string } }>("/api/auth/me").then((res) => {
        if (res.data) { setCurrentUserId(res.data.id); setCurrentLevel(Number(res.data.level)); }
      }).catch(() => {});
    }
  }, []);

  // Fetch recruits for square tab
  const qs: string[] = [];
  if (dateFilter) qs.push(`date=${dateFilter}`);
  if (minLevelFilter !== "all") qs.push(`minLevel=${minLevelFilter}`);
  if (maxLevelFilter !== "all") qs.push(`maxLevel=${maxLevelFilter}`);

  const { data: recruitsRes, isLoading } = useQuery({
    queryKey: ["recruits", dateFilter, minLevelFilter, maxLevelFilter],
    queryFn: () => api.get<{ data: RecruitData[] }>(`/api/recruits${qs.length ? "?" + qs.join("&") : ""}`),
    enabled: activeTab === "square",
  });

  // Fetch my orders for mine tab
  const { data: myOrdersRes, isLoading: mineLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get<{ data: { id: string; startAt: string; endAt: string; status: string; type: string; court: { code: string; name: string }; recruitPost: { id: string; targetLevel: number; levelTolerance: number; minLevel?: number | null; maxLevel?: number | null; maxParticipants: number; deadline: string; status: string; participants: { userId: string; status: string }[] } | null }[] }>("/api/orders/me"),
    enabled: activeTab === "mine" && !!api.getToken(),
  });

  const recruits = recruitsRes?.data || [];
  const myOrders = myOrdersRes?.data || [];

  // Mutations for mine tab
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

  const copyWechat = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("已复制微信号");
  };

  const STATUS_LABELS: Record<string, string> = {
    RECRUITING: "招募中", CONFIRMED: "已确认", RECRUITING_EXPIRED: "招募失效", CANCELLED: "已取消",
  };
  const STATUS_COLORS: Record<string, string> = {
    RECRUITING: "bg-blue-100 text-blue-800", CONFIRMED: "bg-green-100 text-green-800",
    RECRUITING_EXPIRED: "bg-red-100 text-red-800", CANCELLED: "bg-red-100 text-red-800",
  };

  const switchTab = (tab: string) => {
    router.push(`/recruits${tab === "mine" ? "?tab=mine" : ""}`, { scroll: false });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-4 border-b pb-3">
        <button onClick={() => switchTab("square")} className={cn("pb-1 border-b-2 transition-colors", activeTab === "square" ? "font-bold border-black" : "text-gray-500 border-transparent hover:text-black")}>招募广场</button>
        <button onClick={() => switchTab("mine")} className={cn("pb-1 border-b-2 transition-colors", activeTab === "mine" ? "font-bold border-black" : "text-gray-500 border-transparent hover:text-black")}>我的招募</button>
      </div>

      {/* ── Square Tab ── */}
      {activeTab === "square" && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">招募广场</h1>
            <Button size="sm" onClick={() => router.push("/recruits/new")}>发起招募</Button>
          </div>
          <div className="flex gap-2 flex-wrap items-end">
            <div><Label className="text-xs">日期</Label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-36" /></div>
            <div><Label className="text-xs">最低段位</Label>
              <Select value={minLevelFilter} onValueChange={(v) => setMinLevelFilter(v || "all")}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px]"><SelectItem value="all">不限</SelectItem>{[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0].map((v)=><SelectItem key={v} value={String(v)}>{v.toFixed(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">最高段位</Label>
              <Select value={maxLevelFilter} onValueChange={(v) => setMaxLevelFilter(v || "all")}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[280px]"><SelectItem value="all">不限</SelectItem>{[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0].map((v)=><SelectItem key={v} value={String(v)}>{v.toFixed(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(dateFilter||minLevelFilter!=="all"||maxLevelFilter!=="all")&&<Button variant="ghost" size="sm" onClick={()=>{setDateFilter("");setMinLevelFilter("all");setMaxLevelFilter("all");}}>清除</Button>}
          </div>
          {isLoading ? <div className="text-center py-12 text-gray-500">加载中...</div> : recruits.length===0 ? <div className="text-center py-12 text-gray-400">暂无招募</div> : (
            <div className="space-y-3">
              {recruits.map((r) => {
                const isOwn = currentUserId === r.order?.userId;
                const min = r.minLevel != null ? Number(r.minLevel) : Number(r.targetLevel) - Number(r.levelTolerance);
                const max = r.maxLevel != null ? Number(r.maxLevel) : Number(r.targetLevel) + Number(r.levelTolerance);
                return (
                  <Card key={r.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.user?.nickname}</span>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">段位 {String(r.user?.level)}</span>
                          </div>
                          <div className="text-sm text-gray-600">{r.order?.court?.name} · {new Date(r.order?.startAt).toLocaleString("zh-CN")} ~ {new Date(r.order?.endAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}</div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>要求 {min} ~ {max}</span><span>截止 {new Date(r.deadline).toLocaleString("zh-CN")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {isOwn ? (
                              <span className="text-gray-400">我的招募</span>
                            ) : (
                              <>
                                <span className="text-gray-400">微信号: {r.user?.wechatId}</span>
                                <Button variant="ghost" size="sm" className="h-5 text-xs px-1 text-blue-600" onClick={()=>copyWechat(r.user.wechatId)}>复制</Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm font-medium text-blue-600">{r.participants?.length||0}/{r.maxParticipants} 人</span>
                          <Button size="sm" variant="outline" onClick={()=>router.push(`/recruits/${r.id}`)}>详情</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Mine Tab ── */}
      {activeTab === "mine" && (
        <>
          <h1 className="text-2xl font-bold">我的招募</h1>
          {!api.getToken() ? (
            <div className="text-center py-12 text-gray-400"><p className="mb-4">请先登录</p><Button onClick={()=>router.push("/login?redirect=/recruits?tab=mine")}>去登录</Button></div>
          ) : mineLoading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : (
            <div className="space-y-3">
              {myOrders.filter((o)=>o.type==="RECRUIT"&&o.recruitPost).length===0 ? (
                <div className="text-center py-12 text-gray-400"><p className="mb-4">暂无招募</p><Button size="sm" onClick={()=>switchTab("square")}>去看看招募广场</Button></div>
              ) : (
                myOrders.filter((o)=>o.type==="RECRUIT"&&o.recruitPost).map((o) => {
                  const rp = o.recruitPost!;
                  const min = rp.minLevel != null ? Number(rp.minLevel) : Number(rp.targetLevel) - Number(rp.levelTolerance);
                  const max = rp.maxLevel != null ? Number(rp.maxLevel) : Number(rp.targetLevel) + Number(rp.levelTolerance);
                  const joined = rp.participants?.filter((p: { status: string })=>p.status==="JOINED").length||0;
                  const isOwn = currentUserId !== null; // we don't have userId on order in this response
                  return (
                    <Card key={o.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{o.court?.code} - {o.court?.name}</span>
                              <span className={cn("text-xs px-2 py-0.5 rounded font-medium", STATUS_COLORS[rp.status]||"bg-gray-100 text-gray-800")}>{STATUS_LABELS[rp.status]||rp.status}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(o.startAt).toLocaleString("zh-CN")} ~ {new Date(o.endAt).toLocaleString("zh-CN")}</div>
                            <div className="text-xs text-gray-500 mt-0.5">段位 {min} ~ {max} · {joined}/{rp.maxParticipants} 人 · 截止 {new Date(rp.deadline).toLocaleString("zh-CN")}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={()=>router.push(`/recruits/${rp.id}`)}>详情</Button>
                        </div>
                        {rp.status==="RECRUITING_EXPIRED" && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={()=>convertMut.mutate(rp.id)} disabled={convertMut.isPending}>转为包场</Button>
                            <Button size="sm" variant="destructive" onClick={()=>abandonMut.mutate(rp.id)} disabled={abandonMut.isPending}>放弃</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RecruitsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">加载中...</div>}>
      <RecruitsPageInner />
    </Suspense>
  );
}
