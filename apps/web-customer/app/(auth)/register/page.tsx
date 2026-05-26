"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState(3.0);
  const [wechatId, setWechatId] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const originalRedirect = searchParams.get("redirect") || "";
  const loginTarget = "/login" + (originalRedirect ? `?redirect=${encodeURIComponent(originalRedirect)}` : "");

  const handleRegister = async () => {
    if (!phone || !password || !nickname || !wechatId) {
      toast.error("请填写所有必填字段"); return;
    }
    if (password.length < 6) { toast.error("密码至少 6 位"); return; }
    if (!/^1\d{10}$/.test(phone)) { toast.error("手机号格式不正确"); return; }

    setLoading(true);
    try {
      const res = await api.post<{ code: number; message: string }>("/api/auth/register", {
        phone, password, nickname, level, wechatId,
        gender: gender || undefined,
      });
      if (res.code === 0) {
        toast.success("注册成功，请登录");
        router.push(loginTarget);
      } else {
        toast.error(res.message || "注册失败");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>注册</CardTitle>
          <CardDescription>创建账号，开始预订</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">手机号 *</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" />
          </div>
          <div>
            <Label htmlFor="password">密码 *</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" />
          </div>
          <div>
            <Label htmlFor="nickname">昵称 *</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="怎么称呼您" />
          </div>
          <div>
            <Label>网球段位 *</Label>
            <Slider min={1.0} max={5.0} step={0.5} value={level} onValueChange={setLevel} />
          </div>
          <div>
            <Label htmlFor="wechatId">微信号 *</Label>
            <Input id="wechatId" value={wechatId} onChange={(e) => setWechatId(e.target.value)} placeholder="方便球友联系" />
          </div>
          <div>
            <Label>性别</Label>
            <div className="flex gap-2 mt-1">
              {["", "MALE", "FEMALE", "OTHER"].map((v) => (
                <button
                  key={v}
                  type="button"
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
          <Button className="w-full" disabled={loading} onClick={handleRegister}>{loading ? "注册中..." : "注册"}</Button>
          <p className="text-center text-sm text-gray-400">已有账号？<a href={loginTarget} className="text-blue-600 hover:underline">登录</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
