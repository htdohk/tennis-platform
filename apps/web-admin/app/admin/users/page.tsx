"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Ban, CheckCircle, KeyRound } from "lucide-react";
import { useState, useCallback } from "react";

interface User { id: string; phone: string; nickname: string; level: string; wechatId: string; gender: string | null; role: string; status: string; createdAt: string }

const GENDER_MAP: Record<string, string> = { MALE: "男", FEMALE: "女", OTHER: "其他" };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get<{ data: User[] }>("/admin/users") });

  const form = useForm({
    resolver: zodResolver(z.object({
      nickname: z.string().optional(),
      phone: z.string().optional(),
      level: z.string().optional(),
      wechatId: z.string().optional(),
      gender: z.string().optional(),
      status: z.string().optional(),
    })),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Record<string, unknown> }) => api.patch(`/admin/users/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setOpen(false); toast.success("更新成功"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwMut = useMutation({
    mutationFn: (id: string) => api.post<{ data: { password: string } }>(`/admin/users/${id}/reset-password`),
    onSuccess: (data: { data?: { password?: string }; password?: string }) => {
      const pw = data?.data?.password || data?.password || "";
      setNewPassword(pw);
      toast.success("密码已重置");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (d: Record<string, unknown>) => {
    if (!editing) return;
    const clean: Record<string, unknown> = {};
    if (d.nickname) clean.nickname = d.nickname;
    if (d.phone) clean.phone = d.phone;
    if (d.level) clean.level = parseFloat(d.level as string);
    if (d.wechatId !== undefined) clean.wechatId = d.wechatId;
    if (d.gender && d.gender !== "none") clean.gender = d.gender;
    if (d.status) clean.status = d.status;
    updateMut.mutate({ id: editing.id, d: clean });
  };

  const LEVELS = Array.from({ length: 9 }, (_, i) => (1.0 + i * 0.5).toFixed(1));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">用户管理</h1>

      <Table>
        <TableHeader>
          <TableRow><TableHead>昵称</TableHead><TableHead>手机号</TableHead><TableHead>段位</TableHead><TableHead>微信号</TableHead><TableHead>性别</TableHead><TableHead>角色</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {(data?.data || []).map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nickname}</TableCell>
              <TableCell>{u.phone}</TableCell>
              <TableCell>{String(u.level)}</TableCell>
              <TableCell className="text-gray-500">{u.wechatId}</TableCell>
              <TableCell className="text-gray-500">{u.gender ? GENDER_MAP[u.gender] || u.gender : "-"}</TableCell>
              <TableCell>{u.role === "BOSS" ? "老板" : u.role === "STAFF" ? "员工" : "用户"}</TableCell>
              <TableCell>
                <span className={u.status === "ACTIVE" ? "text-green-600" : "text-red-600"}>
                  {u.status === "ACTIVE" ? "正常" : "封禁"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(u); form.reset({ nickname: u.nickname, phone: u.phone, level: String(u.level), wechatId: u.wechatId, gender: u.gender || "none", status: u.status }); setDialogKey((k) => k + 1); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => updateMut.mutate({ id: u.id, d: { status: u.status === "ACTIVE" ? "BANNED" : "ACTIVE" } })}>
                    {u.status === "ACTIVE" ? <Ban className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog key={dialogKey} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑用户</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>昵称</Label><Input {...form.register("nickname")} /></div>
            <div><Label>手机号</Label><Input {...form.register("phone")} /></div>
            <div><Label>段位</Label>
              <Select defaultValue={editing ? String(editing.level) : ""} onValueChange={(v) => { if (v) form.setValue("level", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>微信号</Label><Input {...form.register("wechatId")} /></div>
            <div><Label>性别</Label>
              <Select defaultValue={editing?.gender || "none"} onValueChange={(v) => { if (v) form.setValue("gender", v === "none" ? "" : v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不设置</SelectItem>
                  <SelectItem value="MALE">男</SelectItem>
                  <SelectItem value="FEMALE">女</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>状态</Label>
              <Select defaultValue={editing?.status || ""} onValueChange={(v) => { if (v) form.setValue("status", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">正常</SelectItem>
                  <SelectItem value="BANNED">封禁</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">保存</Button>
              <Button type="button" variant="outline" onClick={() => { setResetPwUser(editing); setResetPwOpen(true); setNewPassword(""); }}>
                <KeyRound className="h-4 w-4 mr-1" />重置密码
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>重置密码</DialogTitle></DialogHeader>
          <p className="text-gray-600">确认重置用户「{resetPwUser?.nickname}」的密码？旧密码将失效。</p>
          {newPassword ? (
            <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
              <p className="text-sm font-medium text-yellow-800">新密码（请记录，关闭后不再显示）：</p>
              <p className="text-lg font-mono font-bold text-yellow-900 mt-1">{newPassword}</p>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetPwOpen(false)}>取消</Button>
              <Button onClick={() => resetPwUser && resetPwMut.mutate(resetPwUser.id)} disabled={resetPwMut.isPending}>
                确认重置
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
