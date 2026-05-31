"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

function EditForm({ me, onSave, onCancel }: {
  me: { nickname: string; wechatId: string; level: number; gender: string | null };
  onSave: (data: { nickname: string; wechatId: string; level: number; gender?: string }) => void;
  onCancel: () => void;
}) {
  const [nickname, setNickname] = useState(me.nickname);
  const [wechatId, setWechatId] = useState(me.wechatId);
  const [level, setLevel] = useState(Number(me.level));
  const [gender, setGender] = useState(me.gender || "");
  return (
    <div className="space-y-3">
      <div><Label>昵称</Label><Input value={nickname} onChange={(e) => setNickname(e.target.value)} /></div>
      <div><Label>微信号</Label><Input value={wechatId} onChange={(e) => setWechatId(e.target.value)} /></div>
      <div>
        <Label>网球段位</Label>
        <div className="py-4">
          <Slider min={1.0} max={5.0} step={0.5} value={level} onValueChange={setLevel} />
        </div>
      </div>
      <div>
        <Label>性别</Label>
        <div className="flex gap-2 mt-1">
          {["", "MALE", "FEMALE", "OTHER"].map((v) => (
            <button
              key={v} type="button"
              onClick={() => setGender(v)}
              className={`px-3 py-1 rounded text-sm border transition-colors ${
                gender === v ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {v === "" ? "不填" : v === "MALE" ? "男" : v === "FEMALE" ? "女" : "其他"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => onSave({ nickname, wechatId, level, gender: gender || undefined })}>保存</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>取消</Button>
      </div>
    </div>
  );
}

export default function MePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bindCode, setBindCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!api.getToken()) { router.push("/login?redirect=/me"); return; }
  }, [router]);

  const { data: meRes, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ data: { id: string; nickname: string; phone: string; level: string; wechatId: string; gender: string | null } }>("/api/auth/me"),
  });

  const me = meRes?.data;

  const updateMut = useMutation({
    mutationFn: (data: { nickname?: string; wechatId?: string; level?: number; gender?: string }) =>
      api.patch("/api/auth/me", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); toast.success("已更新"); setEditing(false); },
    onError: () => toast.error("更新失败"),
  });

  const handleLogout = () => { api.setToken(null); localStorage.removeItem("customer_nickname"); window.dispatchEvent(new Event("auth-change")); router.push("/"); };

  // Countdown timer
  useEffect(() => {
    if (!bindCode) return;
    const updateCountdown = () => {
      const remaining = Math.ceil((new Date(bindCode.expiresAt).getTime() - Date.now()) / 60000);
      if (remaining <= 0) {
        setBindCode(null);
        toast.info("绑定码已过期");
      }
      setCountdown(remaining > 0 ? remaining : 0);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [bindCode]);

  const handleGenerateCode = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await api.post<{ code: number; data: { code: string; expiresAt: string } }>("/api/binding/generate-code");
      setBindCode(res.data);
      toast.success("绑定码已生成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`绑定 ${code}`);
    toast.success("已复制");
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">加载中...</div>;
  if (!me) return <div className="text-center py-12 text-gray-500">请先登录</div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">个人中心</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          {editing ? (
            <EditForm
              key="editing"
              me={{ ...me, level: Number(me.level) }}
              onSave={(data) => updateMut.mutate(data)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="flex justify-between"><span className="text-gray-500">昵称</span><span>{me.nickname}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">手机号</span><span>{me.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">段位</span><span>{String(me.level)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">微信号</span><span>{me.wechatId}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">性别</span><span>{me.gender === "MALE" ? "男" : me.gender === "FEMALE" ? "女" : me.gender === "OTHER" ? "其他" : "-"}</span></div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>编辑资料</Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* WeChat Binding */}
      <Card>
        <CardHeader>
          <CardTitle>微信群绑定</CardTitle>
          <CardDescription>
            绑定后，Hermes 助手可在微信群中自动识别你的身份
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bindCode ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">在微信群对助手说：</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-mono font-bold tracking-widest bg-gray-100 px-4 py-2 rounded">
                  绑定 {bindCode.code}
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyCode(bindCode.code)}>
                  复制
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                {countdown > 0 ? `${countdown} 分钟内有效` : "已过期"}
              </p>
            </div>
          ) : (
            <Button onClick={handleGenerateCode} disabled={generating}>
              {generating ? "生成中..." : "生成绑定码"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.push("/booking?tab=mine")}>我的预订</Button>
        <Button variant="ghost" onClick={handleLogout} className="text-red-500">退出登录</Button>
      </div>
    </div>
  );
}
