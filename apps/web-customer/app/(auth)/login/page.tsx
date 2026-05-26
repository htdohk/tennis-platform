"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleLogin = async () => {
    if (!phone || !password) { toast.error("手机号和密码不能为空"); return; }
    setLoading(true);
    try {
      const res = await api.post<{ code: number; data: { accessToken: string } }>("/api/auth/login", { phone, password });
      if (res.code === 0 && res.data?.accessToken) {
        api.setToken(res.data.accessToken);
        router.push(redirect);
      } else {
        toast.error("登录失败");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "手机号或密码错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>登录</CardTitle>
          <CardDescription>登录后即可预订场地</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <div>
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <Button className="w-full" disabled={loading} onClick={handleLogin}>{loading ? "登录中..." : "登录"}</Button>
          <p className="text-center text-sm text-gray-400">还没有账号？<a href={`/register${redirect !== "/" ? `?redirect=${redirect}` : ""}`} className="text-blue-600 hover:underline">注册</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
