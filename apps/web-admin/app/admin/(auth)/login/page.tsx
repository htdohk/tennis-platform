"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("13800000000");
  const [password, setPassword] = useState("admin123");
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) {
      toast.error("手机号和密码不能为空");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ code: number; data: { accessToken: string } }>(
        "/admin/auth/login",
        { phone, password }
      );
      if (res.code === 0 && res.data?.accessToken) {
        api.setToken(res.data.accessToken);
        router.push("/admin");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Tennis Admin</CardTitle>
          <CardDescription>管理后台登录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              className="w-full"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
